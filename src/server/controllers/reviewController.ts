import { Request, Response } from 'express';
import { Review } from '../models/Review';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { isDbConnected } from '../config/db';
import { memoryStore } from '../config/memoryStore';
import { initialReviews } from '../../services/mockData';

// Ensure memoryStore.reviews has container for all products
if (!memoryStore.reviews) {
  memoryStore.reviews = JSON.parse(JSON.stringify(initialReviews));
}

/**
 * Get reviews and statistical breakdown for a product
 */
export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { sort = 'recent', page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, parseInt(String(limit), 10) || 20);

    let reviewsList: any[] = [];

    if (isDbConnected()) {
      reviewsList = await Review.find({ productId: id, approved: true }).lean();
    } else {
      reviewsList = (memoryStore.reviews[id] || []).filter((r: any) => r.approved !== false);
    }

    // Calculate rating distribution and average rating from actual reviews
    const totalReviews = reviewsList.length;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sumRating = 0;

    reviewsList.forEach((r) => {
      const rounded = Math.round(Math.max(1, Math.min(5, r.rating)));
      distribution[rounded] = (distribution[rounded] || 0) + 1;
      sumRating += r.rating;
    });

    const averageRating = totalReviews > 0 ? parseFloat((sumRating / totalReviews).toFixed(1)) : 5.0;

    // Apply sorting
    const sorted = [...reviewsList].sort((a, b) => {
      if (sort === 'highest') {
        return b.rating - a.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sort === 'lowest') {
        return a.rating - b.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sort === 'helpful') {
        return (b.helpfulCount || 0) - (a.helpfulCount || 0) || b.rating - a.rating;
      }
      // 'recent' by default
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const paginated = sorted.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      success: true,
      productId: id,
      stats: {
        totalReviews,
        averageRating,
        distribution,
      },
      page: pageNum,
      totalPages: Math.ceil(totalReviews / limitNum) || 1,
      reviews: paginated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Submit a customer review with validation and purchase verification
 */
export const createProductReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { rating, comment, title, userId, userName, userEmail } = req.body;

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
      return;
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length < 3) {
      res.status(400).json({ success: false, message: 'Please provide a valid review comment (at least 3 characters).' });
      return;
    }

    const reviewerId = userId || 'usr_guest_' + Date.now();
    const reviewerName = userName || 'Verified Customer';

    // 1. Check for duplicate review by the same user
    const existingReviews = isDbConnected()
      ? await Review.find({ productId: id, userId: reviewerId }).lean()
      : (memoryStore.reviews[id] || []).filter((r: any) => r.userId === reviewerId);

    if (existingReviews && existingReviews.length > 0) {
      res.status(400).json({
        success: false,
        message: 'You have already submitted a customer review for this product.',
      });
      return;
    }

    // 2. Server-enforce purchase verification by checking customer orders
    let isVerifiedPurchase = false;
    if (isDbConnected()) {
      const matchingOrder = await Order.findOne({
        $or: [{ 'customer.userId': reviewerId }, { 'customer.email': userEmail }],
        'items.productId': id,
      }).lean();
      if (matchingOrder) isVerifiedPurchase = true;
    } else {
      const matchingOrder = memoryStore.orders.find(
        (o) =>
          (o.customer.userId === reviewerId || (userEmail && o.customer.email === userEmail)) &&
          o.items.some((item) => item.productId === id)
      );
      if (matchingOrder) isVerifiedPurchase = true;
    }

    // For demo customer, treat as verified purchaser
    if (reviewerId === 'usr_customer_demo' || reviewerId === 'usr_cust_2' || reviewerId === 'usr_cust_3') {
      isVerifiedPurchase = true;
    }

    const newReview = {
      id: 'rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      productId: id,
      userId: reviewerId,
      userName: reviewerName,
      rating: Math.round(numericRating),
      title: title ? String(title).trim() : undefined,
      comment: String(comment).trim(),
      isVerifiedPurchase,
      approved: true,
      helpfulCount: 0,
      helpfulVotes: [],
      createdAt: new Date().toISOString(),
    };

    if (isDbConnected()) {
      await Review.create(newReview);
    }

    // Always update in-memory catalog
    if (!memoryStore.reviews[id]) {
      memoryStore.reviews[id] = [];
    }
    memoryStore.reviews[id].unshift(newReview);

    // Update product rating and review count in memory
    const product = memoryStore.products.find((p) => p.id === id);
    if (product) {
      const allProdReviews = memoryStore.reviews[id];
      const sum = allProdReviews.reduce((acc, curr) => acc + curr.rating, 0);
      product.reviewCount = allProdReviews.length;
      product.rating = parseFloat((sum / allProdReviews.length).toFixed(1));
    }

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      review: newReview,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Helpful voting with duplicate vote prevention
 */
export const voteReviewHelpful = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { voterId } = req.body;

    const voter = voterId || req.ip || 'anonymous_voter';

    // Find review across memoryStore
    let foundReview: any = null;
    let prodId: string | null = null;

    for (const [pId, revList] of Object.entries(memoryStore.reviews)) {
      const match = revList.find((r: any) => r.id === id);
      if (match) {
        foundReview = match;
        prodId = pId;
        break;
      }
    }

    if (!foundReview) {
      if (isDbConnected()) {
        foundReview = await Review.findById(id);
      }
    }

    if (!foundReview) {
      res.status(404).json({ success: false, message: 'Review not found.' });
      return;
    }

    if (!foundReview.helpfulVotes) {
      foundReview.helpfulVotes = [];
    }

    const hasVoted = foundReview.helpfulVotes.includes(voter);
    if (hasVoted) {
      // Toggle off
      foundReview.helpfulVotes = foundReview.helpfulVotes.filter((v: string) => v !== voter);
      foundReview.helpfulCount = Math.max(0, (foundReview.helpfulCount || 1) - 1);
    } else {
      // Add vote
      foundReview.helpfulVotes.push(voter);
      foundReview.helpfulCount = (foundReview.helpfulCount || 0) + 1;
    }

    if (isDbConnected()) {
      await Review.findByIdAndUpdate(id, {
        helpfulCount: foundReview.helpfulCount,
        helpfulVotes: foundReview.helpfulVotes,
      });
    }

    res.json({
      success: true,
      helpfulCount: foundReview.helpfulCount,
      hasVoted: !hasVoted,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Edit review (Author or Admin)
 */
export const updateProductReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { rating, comment, title, userId } = req.body;

    let foundReview: any = null;
    for (const [, revList] of Object.entries(memoryStore.reviews)) {
      const match = revList.find((r: any) => r.id === id);
      if (match) {
        foundReview = match;
        break;
      }
    }

    if (!foundReview) {
      res.status(404).json({ success: false, message: 'Review not found.' });
      return;
    }

    if (userId && foundReview.userId !== userId && req.body.role !== 'super_admin') {
      res.status(403).json({ success: false, message: 'Unauthorized to edit this review.' });
      return;
    }

    if (rating) foundReview.rating = Math.round(Number(rating));
    if (comment) foundReview.comment = String(comment).trim();
    if (title !== undefined) foundReview.title = String(title).trim();

    if (isDbConnected()) {
      await Review.findByIdAndUpdate(id, {
        rating: foundReview.rating,
        comment: foundReview.comment,
        title: foundReview.title,
      });
    }

    res.json({ success: true, review: foundReview });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete review (Author or Admin)
 */
export const deleteProductReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    let deleted = false;
    for (const [prodId, revList] of Object.entries(memoryStore.reviews)) {
      const idx = revList.findIndex((r: any) => r.id === id);
      if (idx !== -1) {
        const rev = revList[idx];
        if (userId && rev.userId !== userId && role !== 'super_admin') {
          res.status(403).json({ success: false, message: 'Unauthorized to delete this review.' });
          return;
        }
        revList.splice(idx, 1);
        deleted = true;
        break;
      }
    }

    if (isDbConnected()) {
      await Review.findByIdAndDelete(id);
    }

    res.json({ success: true, message: 'Review deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
