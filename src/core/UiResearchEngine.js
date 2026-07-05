import fs from 'fs';
import path from 'path';

export class UiResearchEngine {
  constructor(projectManager) {
    this.projectManager = projectManager;
    this.recipes = [
      {
        id: 'glassmorphism-card',
        name: 'Translucent Glassmorphism Card',
        category: 'layout',
        description: 'A beautiful premium card container with blur background, thin white borders, and subtle drop shadow.',
        code: `/* CSS Glassmorphism Card */
.glass-card {
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 16px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.08);
  border-color: rgba(255, 255, 255, 0.45);
}`
      },
      {
        id: 'premium-table',
        name: 'Curated Clean Data Table',
        category: 'component',
        description: 'Responsive table with rounded card container, modern typography, custom scrollbars, and alternating row hover highlights.',
        code: `/* CSS Premium Data Table */
.premium-table-container {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--neutral-200);
  background-color: var(--white);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}
.premium-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.premium-table th {
  background-color: var(--neutral-50);
  color: var(--neutral-600);
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.05em;
  padding: 12px 16px;
}
.premium-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--neutral-100);
  transition: background-color 0.15s ease;
}
.premium-table tr:hover td {
  background-color: rgba(99, 102, 241, 0.02); /* Very subtle brand color tint */
}`
      },
      {
        id: 'hsl-gradient-brand',
        name: 'Vibrant HSL Gradient Brand Accents',
        category: 'styling',
        description: 'Spenturi brand specific gradients utilizing warm and cool HSL palettes for badges, progress bars, and header panels.',
        code: `/* CSS Spenturi Brand Accents */
:root {
  --primary-brand: hsl(238, 72%, 59%);     /* Indigo Primary */
  --primary-brand-light: hsl(238, 100%, 97%);
  --success-brand: hsl(156, 72%, 40%);     /* Emerald Success */
  --accent-orange: hsl(24, 95%, 52%);      /* Orange Accent */
  --accent-purple: hsl(272, 72%, 57%);     /* Purple Secondary */
}
.gradient-brand {
  background: linear-gradient(135deg, var(--primary-brand) 0%, var(--accent-purple) 100%);
}
.gradient-accent {
  background: linear-gradient(135deg, var(--accent-orange) 0%, hsl(12, 95%, 58%) 100%);
}`
      },
      {
        id: 'micro-animations',
        name: 'Subtle Micro-Animations',
        category: 'animation',
        description: 'Interactive button lift translations and loading skeleton shimmers to create a responsive and alive user interface.',
        code: `/* CSS Micro-Animations */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton-shimmer {
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
}
.button-lift {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.button-lift:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}
.button-lift:active {
  transform: translateY(1px);
}`
      }
    ];
  }

  getRecipes() {
    return this.recipes;
  }

  searchRecipes(query) {
    const q = query.toLowerCase();
    return this.recipes.filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.description.toLowerCase().includes(q) || 
      r.category.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q)
    );
  }

  getRecipeById(id) {
    return this.recipes.find(r => r.id === id) || null;
  }
}

export default UiResearchEngine;
