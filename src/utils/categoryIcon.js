/** Maps a category name to a monochrome MaterialCommunityIcons glyph for list rows. */
const ICON_BY_CATEGORY = {
  'Salary': 'briefcase-outline',
  'Other Income': 'cash-plus',
  'Food & Dining': 'silverware-fork-knife',
  'Transport': 'bus',
  'Shopping': 'cart-outline',
  'Bills': 'file-document-outline',
  'Health': 'medical-bag',
  'Entertainment': 'movie-outline',
  'Other': 'shape-outline',
};

export function categoryIconName(categoryName, type) {
  if (categoryName && ICON_BY_CATEGORY[categoryName]) return ICON_BY_CATEGORY[categoryName];
  return type === 'INCOME' ? 'cash-plus' : 'wallet-outline';
}
