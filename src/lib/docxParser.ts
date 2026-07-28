import mammoth from 'mammoth';
import { Category, MenuItem } from '@/types';

export interface ParsedImportResult {
  categories: Omit<Category, 'id'>[];
  items: Omit<MenuItem, 'id'>[];
}

export async function parseDocxMenu(file: File): Promise<ParsedImportResult> {
  let textContent = '';

  if (file.name.endsWith('.docx') || file.type.includes('wordprocessingml')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    textContent = result.value;
  } else {
    // Fallback for plain text files
    textContent = await file.text();
  }

  return parseMenuTextContent(textContent);
}

export function parseMenuTextContent(text: string): ParsedImportResult {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  const categories: Omit<Category, 'id'>[] = [];
  const items: Omit<MenuItem, 'id'>[] = [];

  let currentCategory = 'General';
  let catDisplayOrder = 1;
  let itemDisplayOrder = 1;

  for (const line of lines) {
    // Check if line looks like a category header (ALL CAPS or no price dots/digits at the end)
    const priceMatch = line.match(/(?:[….\s]+)(\d+)\s*$/) || line.match(/(\d+)\s*$/);

    if (!priceMatch && line.length > 2 && line.length < 50 && line === line.toUpperCase()) {
      currentCategory = line;
      if (!categories.find((c) => c.name.toLowerCase() === currentCategory.toLowerCase())) {
        categories.push({
          name: currentCategory,
          description: `${currentCategory} specialties`,
          displayOrder: catDisplayOrder++,
          isEnabled: true,
        });
      }
    } else if (priceMatch) {
      const price = parseInt(priceMatch[1], 10);
      const namePart = line.substring(0, priceMatch.index).replace(/[.…]+$/, '').trim();

      if (namePart) {
        items.push({
          name: namePart,
          description: `Authentic ${namePart.toLowerCase()} prepared fresh at Namahaa Tiffin Room.`,
          price: price,
          categoryId: `cat-${currentCategory.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          categoryName: currentCategory,
          image: '/logo-circle.svg',
          isVeg: true,
          preparationTime: '10 mins',
          isAvailable: true,
          displayOrder: itemDisplayOrder++,
        });
      }
    }
  }

  return { categories, items };
}
