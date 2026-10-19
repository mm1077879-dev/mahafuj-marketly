import assert from 'node:assert/strict';
import test from 'node:test';
import { initialProducts } from './mockData';
import { matchesCrossLingualSearch, normalizeQuery, rankProductsWithCrossLingual } from './crossLingualSearch';

test('Bengali queries match English product names through bilingual metadata', () => {
  const product = {
    ...initialProducts[0],
    name: 'Classic T-Shirt',
    tags: ['শার্ট'],
  };

  assert.equal(matchesCrossLingualSearch(product, 'শার্ট'), true);
});

test('English queries match Bengali product names through bilingual metadata', () => {
  const product = {
    ...initialProducts[0],
    name: 'ক্লাসিক শার্ট',
    tags: ['Shirt'],
  };

  assert.equal(matchesCrossLingualSearch(product, 'shirt'), true);
});

test('expanded category labels do not match unrelated products', () => {
  const sneakers = initialProducts.find((product) => product.id === '1');
  const earbuds = initialProducts.find((product) => product.id === '2');

  assert.ok(sneakers);
  assert.ok(earbuds);
  assert.equal(matchesCrossLingualSearch(sneakers, 'shirt'), false);
  assert.equal(matchesCrossLingualSearch(earbuds, 'mobile phone'), false);
  assert.equal(matchesCrossLingualSearch(sneakers, 'shirt shoes'), false);
});

test('cross-lingual matches remain present in the actual catalog', () => {
  const mobileResults = initialProducts.filter((product) => matchesCrossLingualSearch(product, 'মোবাইল ফোন'));
  const watchResults = initialProducts.filter((product) => matchesCrossLingualSearch(product, 'ঘড়ি'));

  assert.ok(mobileResults.some((product) => product.id === '12'));
  assert.ok(watchResults.some((product) => product.id === '3'));
});

test('query and product text normalization handles whitespace, case, and Unicode normalization', () => {
  const product = {
    ...initialProducts[0],
    name: 'শার্ট'.normalize('NFD'),
    tags: [],
  };

  assert.equal(normalizeQuery('  Shirt   '), 'shirt');
  assert.equal(matchesCrossLingualSearch(product, '  শার্ট  '), true);
  assert.equal(matchesCrossLingualSearch(initialProducts[0], '  AIR   SNEAKERS '), true);
});

test('direct category and description matches remain searchable', () => {
  const product = {
    ...initialProducts[0],
    name: 'Unlabeled item',
    category: 'Books',
    description: 'A mobile phone accessory',
    shortDescription: '',
    tags: [],
  };

  assert.equal(matchesCrossLingualSearch(product, 'Books'), true);
  assert.equal(matchesCrossLingualSearch(product, 'mobile phone'), true);
});

test('empty and unrelated searches preserve expected behavior', () => {
  assert.equal(matchesCrossLingualSearch(initialProducts[0], '   '), true);
  assert.equal(matchesCrossLingualSearch(initialProducts[0], 'unrelated-query-xyz'), false);
});

test('stronger name matches rank ahead of weaker translated field matches', () => {
  const exact = {
    ...initialProducts[0],
    id: 'exact',
    name: 'Shirt',
    tags: [],
  };
  const translated = {
    ...initialProducts[0],
    id: 'translated',
    name: 'Classic Apparel',
    tags: ['শার্ট'],
  };

  const results = rankProductsWithCrossLingual([translated, exact], 'shirt');
  assert.deepEqual(results.map((product) => product.id), ['exact', 'translated']);
});
