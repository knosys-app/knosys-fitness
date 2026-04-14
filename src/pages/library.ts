import type {
  SharedDependencies,
  Recipe,
  MealTemplate,
  NormalizedFood,
  FrequentFood,
  MealType,
} from '../types';
import { MEAL_LABELS, MEAL_TYPES } from '../types';
import { getStorage, getApi } from '../hooks/use-fitness-store';
import { uuid } from '../utils/date-helpers';
import { SIG_PALETTE } from '../theme';
import {
  createPageHeader,
  createSegmentedControl,
  createSignatureCard,
  createSemanticBadge,
  createNumericReadout,
} from '../design-system/primitives';
import { createScopedShadcn } from '../design-system/scoped-shadcn';
import { createEmptyState } from '../components/empty-state';
import { createFoodSearchDialog } from '../components/food-search';
import { createFoodEntryForm } from '../components/food-entry-form';

type Section = 'recipes' | 'templates' | 'custom' | 'frequent';

const SECTION_OPTIONS: { value: Section; label: string; icon: string }[] = [
  { value: 'recipes', label: 'Recipes', icon: 'ChefHat' },
  { value: 'templates', label: 'Meal Templates', icon: 'BookmarkPlus' },
  { value: 'custom', label: 'Custom Foods', icon: 'Apple' },
  { value: 'frequent', label: 'Frequent Foods', icon: 'Repeat' },
];

export function createLibraryPage(Shared: SharedDependencies) {
  const { React, lucideIcons, cn, dateFns } = Shared;
  const { Input, Label, Button } = Shared;
  const Scoped = createScopedShadcn(Shared);
  const {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    Popover,
    PopoverContent,
    PopoverTrigger,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } = Scoped;

  const PageHeader = createPageHeader(Shared);
  const SegmentedControl = createSegmentedControl(Shared);
  const SignatureCard = createSignatureCard(Shared);
  const SemanticBadge = createSemanticBadge(Shared);
  const NumericReadout = createNumericReadout(Shared);
  const EmptyState = createEmptyState(Shared);
  const FoodSearchDialog = createFoodSearchDialog(Shared);
  const FoodEntryForm = createFoodEntryForm(Shared);

  const { Plus, Trash2, Pencil, ChevronRight, MoreHorizontal, Copy, Flame } =
    lucideIcons;

  // =========================================================================
  // Reusable: Section header row with count + action
  // =========================================================================
  function SectionHeader({
    count,
    label,
    action,
  }: {
    count: number;
    label: string;
    action?: any;
  }) {
    return React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        },
      },
      React.createElement(
        'div',
        {
          className: 'knf-eyebrow',
          style: { fontSize: 11 },
        },
        `${label} · ${count}`,
      ),
      action ?? null,
    );
  }

  // =========================================================================
  // Signature Library Row — used for Custom/Frequent lists
  // =========================================================================
  function LibraryRow({
    title,
    subtitle,
    valueNode,
    actions,
    onClick,
  }: {
    title: string;
    subtitle?: string;
    valueNode?: any;
    actions?: any;
    onClick?: () => void;
  }) {
    const [hovered, setHovered] = React.useState(false);
    return React.createElement(
      'div',
      {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
        onClick,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid var(--knf-hairline)',
          background: hovered ? 'var(--knf-hero-wash)' : 'var(--knf-surface)',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'background var(--knf-duration-1) var(--knf-ease)',
        },
      },
      React.createElement(
        'div',
        { style: { flex: 1, minWidth: 0 } },
        React.createElement(
          'div',
          {
            style: {
              fontFamily: 'var(--knf-font-body)',
              fontWeight: 500,
              fontSize: 14,
              color: 'var(--knf-ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          },
          title,
        ),
        subtitle
          ? React.createElement(
              'div',
              {
                style: {
                  fontSize: 11,
                  color: 'var(--knf-muted)',
                  fontFamily: 'var(--knf-font-mono)',
                  marginTop: 2,
                  fontVariantNumeric: 'tabular-nums',
                },
              },
              subtitle,
            )
          : null,
      ),
      valueNode ?? null,
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            gap: 4,
            alignItems: 'center',
            opacity: hovered ? 1 : 0.6,
          },
        },
        actions ?? null,
      ),
    );
  }

  // =========================================================================
  // Recipes Section
  // =========================================================================
  function RecipesSection() {
    const [recipes, setRecipes] = React.useState<Recipe[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [editing, setEditing] = React.useState<Recipe | 'new' | null>(null);

    const load = React.useCallback(async () => {
      setLoading(true);
      const list = await getStorage().getAllRecipes();
      setRecipes(list);
      setLoading(false);
    }, []);

    React.useEffect(() => {
      load();
    }, [load]);

    const deleteRecipe = async (id: string) => {
      await getStorage().deleteRecipe(id);
      await load();
      getApi().ui.showToast('Recipe deleted', 'info');
    };

    const openCreate = () => setEditing('new');

    if (loading) {
      return React.createElement(
        'div',
        { style: { padding: 32, color: 'var(--knf-muted)', fontSize: 13 } },
        'Loading recipes…',
      );
    }

    if (recipes.length === 0) {
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(EmptyState, {
          icon: 'ChefHat',
          title: 'No recipes yet',
          description:
            'Build multi-ingredient meals, save them, and log in a single click.',
          actionLabel: 'Build your first recipe',
          actionIcon: 'Plus',
          action: openCreate,
        }),
        editing !== null
          ? React.createElement(RecipeEditor, {
              recipe: editing === 'new' ? null : editing,
              onSave: async (r: Recipe) => {
                await getStorage().setRecipe(r);
                setEditing(null);
                await load();
                getApi().ui.showToast(`Saved "${r.name}"`, 'success');
              },
              onClose: () => setEditing(null),
            })
          : null,
      );
    }

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(SectionHeader, {
        count: recipes.length,
        label: 'RECIPES',
      }),
      React.createElement(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          },
        },
        ...recipes.map((r) => {
          const totalCal = r.ingredients.reduce(
            (sum, ing) => sum + ing.food.calories * ing.servings,
            0,
          );
          const perServing = Math.round(totalCal / Math.max(r.servings, 1));
          const totalProtein = r.ingredients.reduce(
            (s, ing) => s + ing.food.protein_g * ing.servings,
            0,
          );
          const totalCarbs = r.ingredients.reduce(
            (s, ing) => s + ing.food.carbs_g * ing.servings,
            0,
          );
          const totalFat = r.ingredients.reduce(
            (s, ing) => s + ing.food.fat_g * ing.servings,
            0,
          );

          return React.createElement(
            SignatureCard,
            {
              key: r.id,
              padding: 'md',
              interactive: true,
              accent: 'hero',
              onClick: () => setEditing(r),
            },
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 8,
                },
              },
              React.createElement(
                'div',
                { style: { flex: 1, minWidth: 0 } },
                React.createElement(
                  'div',
                  {
                    className: 'knf-display',
                    style: {
                      fontSize: 'var(--knf-text-h5)',
                      fontWeight: 600,
                      color: 'var(--knf-ink)',
                      letterSpacing: '-0.01em',
                      lineHeight: 1.15,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  },
                  r.name,
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 4,
                    },
                  },
                  React.createElement(SemanticBadge, {
                    accent: 'muted',
                    variant: 'soft',
                  }, `${r.ingredients.length} ingredient${r.ingredients.length === 1 ? '' : 's'}`),
                  React.createElement(SemanticBadge, {
                    accent: 'muted',
                    variant: 'soft',
                  }, `${r.servings} serving${r.servings === 1 ? '' : 's'}`),
                ),
              ),
            ),
            // Per-serving macros row
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 10,
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: '1px solid var(--knf-hairline)',
                },
              },
              React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 4,
                    fontFamily: 'var(--knf-font-mono)',
                  },
                },
                React.createElement(
                  'span',
                  {
                    style: {
                      fontSize: 24,
                      fontWeight: 700,
                      color: 'var(--knf-ink)',
                      fontVariantNumeric: 'tabular-nums slashed-zero',
                    },
                  },
                  perServing,
                ),
                React.createElement(
                  'span',
                  { style: { fontSize: 10, color: 'var(--knf-muted)' } },
                  'kcal / serving',
                ),
              ),
              React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    gap: 4,
                    marginLeft: 'auto',
                  },
                },
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: (e: any) => {
                      e.stopPropagation();
                      setEditing(r);
                    },
                    style: iconBtnStyle(),
                    title: 'Edit',
                  },
                  React.createElement(Pencil, {
                    style: { width: 14, height: 14 },
                  }),
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: (e: any) => {
                      e.stopPropagation();
                      if (
                        typeof window !== 'undefined' &&
                        window.confirm(`Delete recipe "${r.name}"?`)
                      ) {
                        deleteRecipe(r.id);
                      }
                    },
                    style: {
                      ...iconBtnStyle(),
                      color: 'var(--knf-alert)',
                    },
                    title: 'Delete',
                  },
                  React.createElement(Trash2, {
                    style: { width: 14, height: 14 },
                  }),
                ),
              ),
            ),
            // Totals
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  gap: 8,
                  marginTop: 10,
                  fontFamily: 'var(--knf-font-mono)',
                  fontSize: 10,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--knf-muted)',
                },
              },
              React.createElement(
                'span',
                { style: { color: SIG_PALETTE.protein } },
                `P ${Math.round(totalProtein / Math.max(r.servings, 1))}g`,
              ),
              React.createElement(
                'span',
                { style: { color: SIG_PALETTE.carbs } },
                `C ${Math.round(totalCarbs / Math.max(r.servings, 1))}g`,
              ),
              React.createElement(
                'span',
                { style: { color: SIG_PALETTE.fat } },
                `F ${Math.round(totalFat / Math.max(r.servings, 1))}g`,
              ),
            ),
          );
        }),
      ),
      editing !== null
        ? React.createElement(RecipeEditor, {
            recipe: editing === 'new' ? null : editing,
            onSave: async (r: Recipe) => {
              await getStorage().setRecipe(r);
              setEditing(null);
              await load();
              getApi().ui.showToast(`Saved "${r.name}"`, 'success');
            },
            onClose: () => setEditing(null),
          })
        : null,
    );
  }

  // =========================================================================
  // Recipe Editor (scoped Sheet)
  // =========================================================================
  function RecipeEditor({
    recipe,
    onSave,
    onClose,
  }: {
    recipe: Recipe | null;
    onSave: (r: Recipe) => void;
    onClose: () => void;
  }) {
    const [name, setName] = React.useState(recipe?.name ?? '');
    const [servings, setServings] = React.useState(String(recipe?.servings ?? 1));
    const [ingredients, setIngredients] = React.useState<Recipe['ingredients']>(
      recipe?.ingredients ?? [],
    );
    const [notes, setNotes] = React.useState(recipe?.notes ?? '');
    const [searchOpen, setSearchOpen] = React.useState(false);

    const totals = ingredients.reduce(
      (acc, ing) => ({
        calories: acc.calories + ing.food.calories * ing.servings,
        protein_g: acc.protein_g + ing.food.protein_g * ing.servings,
        carbs_g: acc.carbs_g + ing.food.carbs_g * ing.servings,
        fat_g: acc.fat_g + ing.food.fat_g * ing.servings,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );
    const numServings = parseInt(servings) || 1;
    const perServing = {
      calories: Math.round(totals.calories / numServings),
      protein: Math.round((totals.protein_g / numServings) * 10) / 10,
      carbs: Math.round((totals.carbs_g / numServings) * 10) / 10,
      fat: Math.round((totals.fat_g / numServings) * 10) / 10,
    };

    const valid = name.trim().length > 0 && ingredients.length > 0;

    return React.createElement(
      Sheet,
      { open: true, onOpenChange: (o: boolean) => !o && onClose() },
      React.createElement(
        SheetContent,
        {
          side: 'right',
          className: 'sm:max-w-xl w-full overflow-auto',
          style: {
            background: 'var(--knf-bg)',
            padding: 0,
          },
        },
        React.createElement(
          'div',
          { style: { padding: 24 } },
          React.createElement(SheetHeader, null,
            React.createElement(
              'div',
              {
                className: 'knf-eyebrow',
                style: { fontSize: 11, marginBottom: 4 },
              },
              recipe ? 'EDIT RECIPE' : 'NEW RECIPE',
            ),
            React.createElement(
              SheetTitle,
              {
                className: 'knf-display',
                style: {
                  fontFamily: 'var(--knf-font-display)',
                  fontSize: 'var(--knf-text-h3)',
                  fontWeight: 600,
                  color: 'var(--knf-ink)',
                },
              },
              recipe ? recipe.name : 'Build a recipe',
            ),
          ),
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                marginTop: 20,
              },
            },
            // Name
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
              React.createElement(
                Label,
                { style: { fontSize: 11, color: 'var(--knf-muted)' } },
                'RECIPE NAME',
              ),
              React.createElement(Input, {
                value: name,
                onChange: (e: any) => setName(e.target.value),
                placeholder: 'e.g. Chicken Stir Fry',
                className: 'h-9',
              }),
            ),
            // Servings
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
              React.createElement(
                Label,
                { style: { fontSize: 11, color: 'var(--knf-muted)' } },
                'SERVINGS',
              ),
              React.createElement(Input, {
                type: 'number',
                min: 1,
                value: servings,
                onChange: (e: any) => setServings(e.target.value),
                className: 'h-9 w-28 tabular-nums',
              }),
            ),
            // Ingredients header
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 6,
                },
              },
              React.createElement(
                'div',
                { className: 'knf-eyebrow', style: { fontSize: 11 } },
                `INGREDIENTS · ${ingredients.length}`,
              ),
              React.createElement(
                Button,
                {
                  size: 'sm',
                  variant: 'outline',
                  onClick: () => setSearchOpen(true),
                  className: 'h-8 text-xs gap-1',
                },
                React.createElement(Plus, {
                  style: { width: 12, height: 12 },
                }),
                'Add',
              ),
            ),
            // Ingredients list
            ingredients.length > 0
              ? React.createElement(
                  'div',
                  {
                    style: {
                      background: 'var(--knf-surface)',
                      border: '1px solid var(--knf-hairline)',
                      borderRadius: 'var(--knf-radius-md)',
                      overflow: 'hidden',
                    },
                  },
                  ...ingredients.map((ing, i) =>
                    React.createElement(
                      LibraryRow,
                      {
                        key: `${ing.food.id}-${i}`,
                        title: ing.food.name,
                        subtitle: `${ing.servings} × ${ing.food.serving_label} · ${Math.round(ing.food.calories * ing.servings)} cal`,
                        actions: React.createElement(
                          'button',
                          {
                            type: 'button',
                            style: {
                              ...iconBtnStyle(),
                              color: 'var(--knf-alert)',
                            },
                            onClick: () =>
                              setIngredients(
                                ingredients.filter((_, j) => j !== i),
                              ),
                            title: 'Remove',
                          },
                          React.createElement(Trash2, {
                            style: { width: 14, height: 14 },
                          }),
                        ),
                      },
                    ),
                  ),
                )
              : React.createElement(
                  'div',
                  {
                    style: {
                      padding: 24,
                      textAlign: 'center',
                      fontSize: 13,
                      color: 'var(--knf-muted)',
                      background: 'var(--knf-surface-2)',
                      border: '1px dashed var(--knf-hairline)',
                      borderRadius: 'var(--knf-radius-md)',
                    },
                  },
                  'No ingredients yet. Click “Add” to search foods.',
                ),
            // Notes
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
              React.createElement(
                Label,
                { style: { fontSize: 11, color: 'var(--knf-muted)' } },
                'NOTES (optional)',
              ),
              React.createElement(Input, {
                value: notes,
                onChange: (e: any) => setNotes(e.target.value),
                placeholder: 'Cooking time, plating, tips…',
                className: 'h-9',
              }),
            ),
            // Per-serving totals
            ingredients.length > 0
              ? React.createElement(
                  'div',
                  {
                    style: {
                      marginTop: 8,
                      padding: 14,
                      background: 'var(--knf-hero-wash)',
                      border: '1px solid var(--knf-hero-edge)',
                      borderRadius: 'var(--knf-radius-md)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                      gap: 12,
                    },
                  },
                  ...[
                    { k: 'CAL', v: String(perServing.calories), color: SIG_PALETTE.heroInk },
                    { k: 'PROTEIN', v: `${perServing.protein}g`, color: SIG_PALETTE.protein },
                    { k: 'CARBS', v: `${perServing.carbs}g`, color: SIG_PALETTE.carbs },
                    { k: 'FAT', v: `${perServing.fat}g`, color: SIG_PALETTE.fat },
                  ].map((m) =>
                    React.createElement(
                      'div',
                      {
                        key: m.k,
                        style: {
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                        },
                      },
                      React.createElement(
                        'span',
                        {
                          style: {
                            fontFamily: 'var(--knf-font-mono)',
                            fontSize: 9,
                            color: m.color,
                            letterSpacing: '0.1em',
                            fontWeight: 600,
                          },
                        },
                        m.k,
                      ),
                      React.createElement(
                        'span',
                        {
                          style: {
                            fontFamily: 'var(--knf-font-mono)',
                            fontSize: 18,
                            fontWeight: 700,
                            color: 'var(--knf-ink)',
                            fontVariantNumeric: 'tabular-nums',
                          },
                        },
                        m.v,
                      ),
                    ),
                  ),
                )
              : null,
            // Actions
            React.createElement(
              'div',
              {
                style: { display: 'flex', gap: 8, marginTop: 16 },
              },
              React.createElement(
                Button,
                {
                  variant: 'outline',
                  onClick: onClose,
                  className: 'flex-1',
                },
                'Cancel',
              ),
              React.createElement(
                Button,
                {
                  disabled: !valid,
                  onClick: () => {
                    const saved: Recipe = {
                      id: recipe?.id ?? uuid(),
                      name: name.trim(),
                      servings: numServings,
                      ingredients,
                      notes: notes.trim() || undefined,
                    };
                    onSave(saved);
                  },
                  className: 'flex-1',
                },
                recipe ? 'Update recipe' : 'Save recipe',
              ),
            ),
          ),
        ),
        React.createElement(FoodSearchDialog, {
          open: searchOpen,
          onOpenChange: setSearchOpen,
          mealType: 'breakfast',
          onAddFood: (food: NormalizedFood, qty: number) =>
            setIngredients([...ingredients, { food, servings: qty }]),
        }),
      ),
    );
  }

  // =========================================================================
  // Templates Section
  // =========================================================================
  function TemplatesSection() {
    const [templates, setTemplates] = React.useState<MealTemplate[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [editing, setEditing] = React.useState<MealTemplate | null>(null);
    const [createOpen, setCreateOpen] = React.useState(false);
    const [newName, setNewName] = React.useState('');
    const [useTargetOpen, setUseTargetOpen] = React.useState<string | null>(null);

    const load = React.useCallback(async () => {
      setLoading(true);
      const list = await getStorage().getAllTemplates();
      setTemplates(list);
      setLoading(false);
    }, []);

    React.useEffect(() => {
      load();
    }, [load]);

    const handleDelete = async (id: string) => {
      await getStorage().deleteTemplate(id);
      await load();
    };

    const applyToMeal = async (tmpl: MealTemplate, mealType: MealType) => {
      const s = getStorage();
      // Today's date
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;
      const meal = await s.getMeal(dateKey, mealType);
      for (const item of tmpl.items) {
        meal.entries.push({
          id: uuid(),
          food: item.food,
          servings: item.servings,
        });
        await s.trackFoodUsage(item.food);
      }
      await s.setMeal(dateKey, mealType, meal);
      getApi().ui.showToast(
        `Applied “${tmpl.name}” to ${MEAL_LABELS[mealType]}`,
        'success',
      );
      setUseTargetOpen(null);
    };

    const createTemplate = async () => {
      if (!newName.trim()) return;
      const t: MealTemplate = {
        id: uuid(),
        name: newName.trim(),
        items: [],
      };
      await getStorage().setTemplate(t);
      setNewName('');
      setCreateOpen(false);
      setEditing(t);
    };

    if (loading) {
      return React.createElement(
        'div',
        { style: { padding: 32, color: 'var(--knf-muted)', fontSize: 13 } },
        'Loading templates…',
      );
    }

    const createButton = React.createElement(
      Button,
      {
        size: 'sm',
        onClick: () => setCreateOpen(true),
        className: 'h-8 text-xs gap-1',
      },
      React.createElement(Plus, { style: { width: 12, height: 12 } }),
      'New template',
    );

    const editorNode = editing
      ? React.createElement(TemplateEditor, {
          template: editing,
          onSave: async (t: MealTemplate) => {
            await getStorage().setTemplate(t);
            setEditing(null);
            await load();
            getApi().ui.showToast(`Saved “${t.name}”`, 'success');
          },
          onClose: () => setEditing(null),
        })
      : null;

    const createDialog = React.createElement(
      Dialog,
      { open: createOpen, onOpenChange: setCreateOpen },
      React.createElement(
        DialogContent,
        { style: { maxWidth: 420 } },
        React.createElement(
          DialogHeader,
          null,
          React.createElement(DialogTitle, null, 'Create meal template'),
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          React.createElement(
            Label,
            { style: { fontSize: 11, color: 'var(--knf-muted)' } },
            'TEMPLATE NAME',
          ),
          React.createElement(Input, {
            value: newName,
            onChange: (e: any) => setNewName(e.target.value),
            placeholder: 'e.g. My Breakfast',
            autoFocus: true,
            className: 'h-9',
          }),
        ),
        React.createElement(
          DialogFooter,
          null,
          React.createElement(
            Button,
            { variant: 'outline', onClick: () => setCreateOpen(false) },
            'Cancel',
          ),
          React.createElement(
            Button,
            { onClick: createTemplate, disabled: !newName.trim() },
            'Create',
          ),
        ),
      ),
    );

    if (templates.length === 0) {
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(EmptyState, {
          icon: 'BookmarkPlus',
          title: 'No meal templates yet',
          description:
            'Save common meals once, then apply them to today’s diary in a click.',
          actionLabel: 'New template',
          actionIcon: 'Plus',
          action: () => setCreateOpen(true),
        }),
        createDialog,
        editorNode,
      );
    }

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(SectionHeader, {
        count: templates.length,
        label: 'TEMPLATES',
        action: createButton,
      }),
      React.createElement(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          },
        },
        ...templates.map((t) => {
          const totalCal = t.items.reduce(
            (s, it) => s + it.food.calories * it.servings,
            0,
          );
          return React.createElement(
            SignatureCard,
            {
              key: t.id,
              padding: 'md',
              interactive: true,
              accent: 'hero',
            },
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 10,
                },
              },
              React.createElement(
                'div',
                { style: { flex: 1, minWidth: 0 } },
                React.createElement(
                  'div',
                  {
                    className: 'knf-display',
                    style: {
                      fontSize: 'var(--knf-text-h5)',
                      fontWeight: 600,
                      color: 'var(--knf-ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  },
                  t.name,
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      fontSize: 11,
                      color: 'var(--knf-muted)',
                      fontFamily: 'var(--knf-font-mono)',
                    },
                  },
                  `${t.items.length} item${t.items.length === 1 ? '' : 's'}`,
                ),
              ),
            ),
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 4,
                  fontFamily: 'var(--knf-font-mono)',
                  padding: '8px 0',
                },
              },
              React.createElement(
                'span',
                {
                  style: {
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--knf-ink)',
                    fontVariantNumeric: 'tabular-nums slashed-zero',
                  },
                },
                Math.round(totalCal),
              ),
              React.createElement(
                'span',
                { style: { fontSize: 10, color: 'var(--knf-muted)' } },
                'kcal total',
              ),
            ),
            // Apply dropdown (scoped DropdownMenu)
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  gap: 6,
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid var(--knf-hairline)',
                },
              },
              React.createElement(
                DropdownMenu,
                null,
                React.createElement(
                  DropdownMenuTrigger,
                  { asChild: true },
                  React.createElement(
                    Button,
                    {
                      size: 'sm',
                      className: 'flex-1 h-8 text-xs gap-1',
                      disabled: t.items.length === 0,
                    },
                    React.createElement(Copy, {
                      style: { width: 12, height: 12 },
                    }),
                    'Use',
                  ),
                ),
                React.createElement(
                  DropdownMenuContent,
                  { align: 'start' },
                  React.createElement(
                    DropdownMenuLabel,
                    null,
                    'Apply to today',
                  ),
                  React.createElement(DropdownMenuSeparator, null),
                  ...MEAL_TYPES.map((mt: MealType) =>
                    React.createElement(
                      DropdownMenuItem,
                      {
                        key: mt,
                        onClick: () => applyToMeal(t, mt),
                      },
                      MEAL_LABELS[mt],
                    ),
                  ),
                ),
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => setEditing(t),
                  style: iconBtnStyle(),
                  title: 'Edit',
                },
                React.createElement(Pencil, {
                  style: { width: 14, height: 14 },
                }),
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    if (
                      typeof window !== 'undefined' &&
                      window.confirm(`Delete template "${t.name}"?`)
                    ) {
                      handleDelete(t.id);
                    }
                  },
                  style: {
                    ...iconBtnStyle(),
                    color: 'var(--knf-alert)',
                  },
                  title: 'Delete',
                },
                React.createElement(Trash2, {
                  style: { width: 14, height: 14 },
                }),
              ),
            ),
          );
        }),
      ),
      createDialog,
      editorNode,
    );
  }

  // =========================================================================
  // Template Editor (scoped Sheet)
  // =========================================================================
  function TemplateEditor({
    template,
    onSave,
    onClose,
  }: {
    template: MealTemplate;
    onSave: (t: MealTemplate) => void;
    onClose: () => void;
  }) {
    const [name, setName] = React.useState(template.name);
    const [items, setItems] = React.useState(template.items);
    const [searchOpen, setSearchOpen] = React.useState(false);
    const totalCal = items.reduce(
      (s, it) => s + it.food.calories * it.servings,
      0,
    );

    return React.createElement(
      Sheet,
      { open: true, onOpenChange: (o: boolean) => !o && onClose() },
      React.createElement(
        SheetContent,
        {
          side: 'right',
          className: 'sm:max-w-lg w-full overflow-auto',
          style: {
            background: 'var(--knf-bg)',
            padding: 0,
          },
        },
        React.createElement(
          'div',
          { style: { padding: 24 } },
          React.createElement(SheetHeader, null,
            React.createElement(
              'div',
              {
                className: 'knf-eyebrow',
                style: { fontSize: 11, marginBottom: 4 },
              },
              'EDIT TEMPLATE',
            ),
            React.createElement(
              SheetTitle,
              {
                style: {
                  fontFamily: 'var(--knf-font-display)',
                  fontSize: 'var(--knf-text-h3)',
                  fontWeight: 600,
                  color: 'var(--knf-ink)',
                },
              },
              template.name,
            ),
          ),
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                marginTop: 20,
              },
            },
            React.createElement(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
              React.createElement(
                Label,
                { style: { fontSize: 11, color: 'var(--knf-muted)' } },
                'TEMPLATE NAME',
              ),
              React.createElement(Input, {
                value: name,
                onChange: (e: any) => setName(e.target.value),
                className: 'h-9',
              }),
            ),
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                },
              },
              React.createElement(
                'div',
                { className: 'knf-eyebrow', style: { fontSize: 11 } },
                `ITEMS · ${items.length} · ${Math.round(totalCal)} kcal`,
              ),
              React.createElement(
                Button,
                {
                  size: 'sm',
                  variant: 'outline',
                  onClick: () => setSearchOpen(true),
                  className: 'h-8 text-xs gap-1',
                },
                React.createElement(Plus, {
                  style: { width: 12, height: 12 },
                }),
                'Add food',
              ),
            ),
            items.length > 0
              ? React.createElement(
                  'div',
                  {
                    style: {
                      background: 'var(--knf-surface)',
                      border: '1px solid var(--knf-hairline)',
                      borderRadius: 'var(--knf-radius-md)',
                      overflow: 'hidden',
                    },
                  },
                  ...items.map((it, i) =>
                    React.createElement(LibraryRow, {
                      key: `${it.food.id}-${i}`,
                      title: it.food.name,
                      subtitle: `${it.servings} × ${it.food.serving_label} · ${Math.round(it.food.calories * it.servings)} cal`,
                      actions: React.createElement(
                        'button',
                        {
                          type: 'button',
                          style: {
                            ...iconBtnStyle(),
                            color: 'var(--knf-alert)',
                          },
                          onClick: () =>
                            setItems(items.filter((_, j) => j !== i)),
                          title: 'Remove',
                        },
                        React.createElement(Trash2, {
                          style: { width: 14, height: 14 },
                        }),
                      ),
                    }),
                  ),
                )
              : React.createElement(
                  'div',
                  {
                    style: {
                      padding: 24,
                      textAlign: 'center',
                      fontSize: 13,
                      color: 'var(--knf-muted)',
                      background: 'var(--knf-surface-2)',
                      border: '1px dashed var(--knf-hairline)',
                      borderRadius: 'var(--knf-radius-md)',
                    },
                  },
                  'No items yet. Add foods to this template.',
                ),
            React.createElement(
              'div',
              { style: { display: 'flex', gap: 8, marginTop: 8 } },
              React.createElement(
                Button,
                {
                  variant: 'outline',
                  onClick: onClose,
                  className: 'flex-1',
                },
                'Cancel',
              ),
              React.createElement(
                Button,
                {
                  disabled: !name.trim(),
                  onClick: () =>
                    onSave({ ...template, name: name.trim(), items }),
                  className: 'flex-1',
                },
                'Save template',
              ),
            ),
          ),
        ),
        React.createElement(FoodSearchDialog, {
          open: searchOpen,
          onOpenChange: setSearchOpen,
          mealType: 'breakfast',
          onAddFood: (food: NormalizedFood, qty: number) =>
            setItems([...items, { food, servings: qty }]),
        }),
      ),
    );
  }

  // =========================================================================
  // Custom Foods Section
  // =========================================================================
  function CustomFoodsSection({
    createOpen,
    setCreateOpen,
  }: {
    createOpen: boolean;
    setCreateOpen: (o: boolean) => void;
  }) {
    const [foods, setFoods] = React.useState<NormalizedFood[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [confirmId, setConfirmId] = React.useState<string | null>(null);

    const load = React.useCallback(async () => {
      setLoading(true);
      const list = await getStorage().getAllCustomFoods();
      setFoods(list);
      setLoading(false);
    }, []);

    React.useEffect(() => {
      load();
    }, [load]);

    const handleDelete = async (id: string) => {
      await getStorage().deleteCustomFood(id);
      setConfirmId(null);
      await load();
      getApi().ui.showToast('Food deleted', 'info');
    };

    if (loading) {
      return React.createElement(
        'div',
        { style: { padding: 32, color: 'var(--knf-muted)', fontSize: 13 } },
        'Loading custom foods…',
      );
    }

    if (foods.length === 0) {
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(EmptyState, {
          icon: 'Apple',
          title: 'No custom foods yet',
          description:
            'Add foods you eat often but can’t find in the database, and log them in seconds.',
          actionLabel: 'Add custom food',
          actionIcon: 'Plus',
          action: () => setCreateOpen(true),
        }),
        React.createElement(FoodEntryForm, {
          open: createOpen,
          onOpenChange: setCreateOpen,
          onSave: async () => {
            await load();
            getApi().ui.showToast('Custom food saved', 'success');
          },
        }),
      );
    }

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(SectionHeader, {
        count: foods.length,
        label: 'CUSTOM FOODS',
      }),
      React.createElement(
        SignatureCard,
        { padding: 'none' },
        React.createElement(
          'div',
          null,
          ...foods.map((f, i) =>
            React.createElement(LibraryRow, {
              key: f.id,
              title: f.name,
              subtitle: [
                f.brand,
                f.serving_label,
                `${Math.round(f.calories)} kcal`,
                `P${Math.round(f.protein_g)} C${Math.round(f.carbs_g)} F${Math.round(f.fat_g)}`,
              ]
                .filter(Boolean)
                .join(' · '),
              actions: React.createElement(
                React.Fragment,
                null,
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: (e: any) => {
                      e.stopPropagation();
                      setConfirmId(confirmId === f.id ? null : f.id);
                    },
                    style: {
                      ...iconBtnStyle(),
                      color:
                        confirmId === f.id
                          ? 'var(--knf-alert)'
                          : 'var(--knf-muted)',
                    },
                    title: 'Delete',
                  },
                  React.createElement(Trash2, {
                    style: { width: 14, height: 14 },
                  }),
                ),
                confirmId === f.id
                  ? React.createElement(
                      'button',
                      {
                        type: 'button',
                        onClick: (e: any) => {
                          e.stopPropagation();
                          handleDelete(f.id);
                        },
                        style: {
                          padding: '4px 10px',
                          fontSize: 11,
                          fontFamily: 'var(--knf-font-mono)',
                          fontWeight: 600,
                          background: 'var(--knf-alert)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 'var(--knf-radius-pill)',
                          cursor: 'pointer',
                        },
                      },
                      'Confirm',
                    )
                  : null,
              ),
            }),
          ),
        ),
      ),
      React.createElement(FoodEntryForm, {
        open: createOpen,
        onOpenChange: setCreateOpen,
        onSave: async () => {
          await load();
          getApi().ui.showToast('Custom food saved', 'success');
        },
      }),
    );
  }

  // =========================================================================
  // Frequent Foods Section
  // =========================================================================
  function FrequentFoodsSection() {
    const [frequent, setFrequent] = React.useState<FrequentFood[]>([]);
    const [loading, setLoading] = React.useState(true);

    const load = React.useCallback(async () => {
      setLoading(true);
      const list = await getStorage().getFrequentFoods();
      setFrequent(list);
      setLoading(false);
    }, []);

    React.useEffect(() => {
      load();
    }, [load]);

    const logTo = async (f: NormalizedFood, meal: MealType) => {
      const s = getStorage();
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;
      const log = await s.getMeal(dateKey, meal);
      log.entries.push({ id: uuid(), food: f, servings: 1 });
      await s.setMeal(dateKey, meal, log);
      await s.trackFoodUsage(f);
      getApi().ui.showToast(
        `Logged ${f.name} to ${MEAL_LABELS[meal]}`,
        'success',
      );
      await load();
    };

    if (loading) {
      return React.createElement(
        'div',
        { style: { padding: 32, color: 'var(--knf-muted)', fontSize: 13 } },
        'Loading frequent foods…',
      );
    }

    if (frequent.length === 0) {
      return React.createElement(EmptyState, {
        icon: 'Repeat',
        title: 'Your frequently-logged foods will appear here',
        description:
          'As you log foods, the ones you eat most will surface here for quick re-logging.',
        compact: false,
      });
    }

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(SectionHeader, {
        count: frequent.length,
        label: 'FREQUENT FOODS',
      }),
      React.createElement(
        SignatureCard,
        { padding: 'none' },
        React.createElement(
          'div',
          null,
          ...frequent.map((f) => {
            const last = (() => {
              try {
                const d = new Date(f.last_used);
                if (!isFinite(d.getTime())) return null;
                return dateFns.format(d, 'MMM d');
              } catch {
                return null;
              }
            })();
            return React.createElement(LibraryRow, {
              key: `${f.food.source}:${f.food.id}`,
              title: f.food.name,
              subtitle: [
                f.food.brand,
                f.food.serving_label,
                `${Math.round(f.food.calories)} kcal`,
                `used ${f.count}×`,
                last ? `last ${last}` : null,
              ]
                .filter(Boolean)
                .join(' · '),
              valueNode: React.createElement(SemanticBadge, {
                accent: 'hero',
                variant: 'soft',
              }, `${f.count}`),
              actions: React.createElement(
                DropdownMenu,
                null,
                React.createElement(
                  DropdownMenuTrigger,
                  { asChild: true },
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      style: iconBtnStyle(),
                      title: 'Log to meal',
                    },
                    React.createElement(Plus, {
                      style: { width: 14, height: 14 },
                    }),
                  ),
                ),
                React.createElement(
                  DropdownMenuContent,
                  { align: 'end' },
                  React.createElement(
                    DropdownMenuLabel,
                    null,
                    'Log 1 serving to',
                  ),
                  React.createElement(DropdownMenuSeparator, null),
                  ...MEAL_TYPES.map((mt: MealType) =>
                    React.createElement(
                      DropdownMenuItem,
                      {
                        key: mt,
                        onClick: () => logTo(f.food, mt),
                      },
                      MEAL_LABELS[mt],
                    ),
                  ),
                ),
              ),
            });
          }),
        ),
      ),
    );
  }

  // =========================================================================
  // MAIN PAGE
  // =========================================================================
  return function LibraryPage() {
    const [section, setSection] = React.useState<Section>(() => {
      if (typeof window === 'undefined') return 'recipes';
      const sp = new URLSearchParams(window.location.search);
      const s = sp.get('section') as Section | null;
      if (s && SECTION_OPTIONS.some((o) => o.value === s)) return s;
      return 'recipes';
    });

    // State hoisted for CustomFoodsSection's create dialog so the "+ New" at
    // the header can trigger it. Re-used only in the custom section.
    const [customCreateOpen, setCustomCreateOpen] = React.useState(false);

    // Similarly for recipes/templates, the section-level "New" is exposed
    // via the header. We toggle via a key-reset signal the subsections
    // listen for. Implementation: bump a counter; the subsections read it.
    const [recipesNewTick, setRecipesNewTick] = React.useState(0);
    const [templatesNewTick, setTemplatesNewTick] = React.useState(0);

    React.useEffect(() => {
      if (typeof window === 'undefined') return;
      const sp = new URLSearchParams(window.location.search);
      sp.set('tab', 'library');
      sp.set('section', section);
      const next = `${window.location.pathname}?${sp.toString()}`;
      if (next !== window.location.pathname + window.location.search) {
        window.history.replaceState(null, '', next);
      }
    }, [section]);

    const newButton = React.createElement(
      'button',
      {
        type: 'button',
        onClick: () => {
          if (section === 'custom') setCustomCreateOpen(true);
          else if (section === 'recipes') setRecipesNewTick((t) => t + 1);
          else if (section === 'templates') setTemplatesNewTick((t) => t + 1);
        },
        disabled: section === 'frequent',
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          fontFamily: 'var(--knf-font-body)',
          fontWeight: 600,
          fontSize: 13,
          color:
            section === 'frequent' ? 'var(--knf-muted)' : 'var(--knf-hero-ink)',
          background:
            section === 'frequent' ? 'var(--knf-surface-2)' : 'var(--knf-hero)',
          border: `1px solid ${section === 'frequent' ? 'var(--knf-hairline)' : 'var(--knf-hero-edge)'}`,
          borderRadius: 'var(--knf-radius-pill)',
          cursor: section === 'frequent' ? 'not-allowed' : 'pointer',
          boxShadow:
            section === 'frequent' ? 'none' : 'var(--knf-shadow-sm)',
          transition: 'transform var(--knf-duration-1) var(--knf-ease)',
        },
      },
      React.createElement(Plus, { style: { width: 14, height: 14 } }),
      'New',
    );

    return React.createElement(
      'div',
      {
        // Full-bleed wrapper: guarantees bone background covers the full
        // viewport even when the active section has short content. Uses
        // flex:1 so it grows to fill the fade wrapper (flex parent).
        style: {
          flex: 1,
          alignSelf: 'stretch',
          width: '100%',
          minHeight: '100%',
          background: 'var(--knf-bg)',
          display: 'flex',
          flexDirection: 'column',
        },
      },
      React.createElement(
        'div',
        {
          // Centered content column
          style: {
            flex: 1,
            width: '100%',
            padding: '32px 40px 64px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            maxWidth: 1360,
            margin: '0 auto',
            boxSizing: 'border-box',
          },
        },
        React.createElement(PageHeader, {
          eyebrow: 'YOUR LIBRARY',
          title: 'Library',
          trailing: newButton,
        }),
        React.createElement(
          'div',
          null,
          React.createElement(SegmentedControl, {
            value: section,
            onValueChange: (v: string) => setSection(v as Section),
            options: SECTION_OPTIONS,
            size: 'md',
            ariaLabel: 'Library section',
          }),
        ),
        React.createElement(
          'div',
          { style: { marginTop: 4, flex: 1 } },
          section === 'recipes'
            ? React.createElement(RecipesSectionWithNewTick, {
                tick: recipesNewTick,
              })
            : null,
          section === 'templates'
            ? React.createElement(TemplatesSectionWithNewTick, {
                tick: templatesNewTick,
              })
            : null,
          section === 'custom'
            ? React.createElement(CustomFoodsSection, {
                createOpen: customCreateOpen,
                setCreateOpen: setCustomCreateOpen,
              })
            : null,
          section === 'frequent'
            ? React.createElement(FrequentFoodsSection, null)
            : null,
        ),
      ),
    );
  };

  // Wrapper components that react to the "new" tick from the page header.
  // We use a small wrapper to keep the Recipes/Templates sections
  // self-contained while letting the header open their editors.
  function RecipesSectionWithNewTick({ tick }: { tick: number }) {
    const ref = React.useRef(tick);
    const [bumpOpen, setBumpOpen] = React.useState(false);
    React.useEffect(() => {
      if (tick !== ref.current) {
        ref.current = tick;
        setBumpOpen(true);
      }
    }, [tick]);
    // Render the section; when bumpOpen is true, we need it to open "new"
    // on mount. We implement this by passing a controlled flag via closure
    // into the section's own new-dialog trigger. To keep things simple,
    // re-render the section under a key so it re-mounts with "new" open.
    return React.createElement(RecipesSectionWithInitNew, {
      initNew: bumpOpen,
      onHandled: () => setBumpOpen(false),
    });
  }

  function TemplatesSectionWithNewTick({ tick }: { tick: number }) {
    const ref = React.useRef(tick);
    const [bumpOpen, setBumpOpen] = React.useState(false);
    React.useEffect(() => {
      if (tick !== ref.current) {
        ref.current = tick;
        setBumpOpen(true);
      }
    }, [tick]);
    return React.createElement(TemplatesSectionWithInitNew, {
      initNew: bumpOpen,
      onHandled: () => setBumpOpen(false),
    });
  }

  // Thin shims so the outer "+ New" button can inject initNew — the
  // Recipes and Templates sections consume this to open their own
  // editor/dialog without needing external state plumbing.
  function RecipesSectionWithInitNew({
    initNew,
    onHandled,
  }: {
    initNew: boolean;
    onHandled: () => void;
  }) {
    // We simulate "open new" by passing an opener via a render-time trigger.
    // Do it by providing a tiny wrapper that calls a setter on mount or
    // when `initNew` flips to true.
    const [openNewSignal, setOpenNewSignal] = React.useState<number>(0);
    React.useEffect(() => {
      if (initNew) {
        setOpenNewSignal((n) => n + 1);
        onHandled();
      }
    }, [initNew, onHandled]);
    return React.createElement(RecipesSectionShell, {
      openNewSignal,
    });
  }
  function TemplatesSectionWithInitNew({
    initNew,
    onHandled,
  }: {
    initNew: boolean;
    onHandled: () => void;
  }) {
    const [openNewSignal, setOpenNewSignal] = React.useState<number>(0);
    React.useEffect(() => {
      if (initNew) {
        setOpenNewSignal((n) => n + 1);
        onHandled();
      }
    }, [initNew, onHandled]);
    return React.createElement(TemplatesSectionShell, { openNewSignal });
  }

  function RecipesSectionShell({ openNewSignal }: { openNewSignal: number }) {
    // We reuse the top-level RecipesSection but pass openNewSignal via a
    // React key to effectively re-mount it in "new" mode. Instead, we
    // add a tiny effect that toggles the editor open when the signal
    // changes. To keep behavior simple, we re-render RecipesSection and
    // include an internal hook to open the editor on signal bumps.
    return React.createElement(RecipesSectionImpl, {
      openNewSignal,
    });
  }
  function TemplatesSectionShell({
    openNewSignal,
  }: {
    openNewSignal: number;
  }) {
    return React.createElement(TemplatesSectionImpl, { openNewSignal });
  }

  // Concrete implementations that accept a signal to open the "new" editor.
  function RecipesSectionImpl({ openNewSignal }: { openNewSignal: number }) {
    // Nearly identical to RecipesSection above but includes a hook for
    // the open-new signal.
    const [recipes, setRecipes] = React.useState<Recipe[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [editing, setEditing] = React.useState<Recipe | 'new' | null>(null);
    const signalRef = React.useRef(openNewSignal);

    const load = React.useCallback(async () => {
      setLoading(true);
      const list = await getStorage().getAllRecipes();
      setRecipes(list);
      setLoading(false);
    }, []);

    React.useEffect(() => {
      load();
    }, [load]);

    React.useEffect(() => {
      if (openNewSignal !== signalRef.current) {
        signalRef.current = openNewSignal;
        setEditing('new');
      }
    }, [openNewSignal]);

    const deleteRecipe = async (id: string) => {
      await getStorage().deleteRecipe(id);
      await load();
    };

    if (loading) {
      return React.createElement(
        'div',
        { style: { padding: 32, color: 'var(--knf-muted)', fontSize: 13 } },
        'Loading recipes…',
      );
    }

    if (recipes.length === 0) {
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(EmptyState, {
          icon: 'ChefHat',
          title: 'No recipes yet',
          description:
            'Build multi-ingredient meals, save them, and log in a single click.',
          actionLabel: 'Build your first recipe',
          actionIcon: 'Plus',
          action: () => setEditing('new'),
        }),
        editing !== null
          ? React.createElement(RecipeEditor, {
              recipe: editing === 'new' ? null : editing,
              onSave: async (r: Recipe) => {
                await getStorage().setRecipe(r);
                setEditing(null);
                await load();
                getApi().ui.showToast(`Saved "${r.name}"`, 'success');
              },
              onClose: () => setEditing(null),
            })
          : null,
      );
    }

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(SectionHeader, {
        count: recipes.length,
        label: 'RECIPES',
      }),
      React.createElement(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          },
        },
        ...recipes.map((r) => {
          const totalCal = r.ingredients.reduce(
            (sum, ing) => sum + ing.food.calories * ing.servings,
            0,
          );
          const perServing = Math.round(totalCal / Math.max(r.servings, 1));
          const totalProtein = r.ingredients.reduce(
            (s, ing) => s + ing.food.protein_g * ing.servings,
            0,
          );
          const totalCarbs = r.ingredients.reduce(
            (s, ing) => s + ing.food.carbs_g * ing.servings,
            0,
          );
          const totalFat = r.ingredients.reduce(
            (s, ing) => s + ing.food.fat_g * ing.servings,
            0,
          );
          return React.createElement(
            SignatureCard,
            {
              key: r.id,
              padding: 'md',
              interactive: true,
              accent: 'hero',
              onClick: () => setEditing(r),
            },
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 8,
                },
              },
              React.createElement(
                'div',
                { style: { flex: 1, minWidth: 0 } },
                React.createElement(
                  'div',
                  {
                    className: 'knf-display',
                    style: {
                      fontSize: 'var(--knf-text-h5)',
                      fontWeight: 600,
                      color: 'var(--knf-ink)',
                      letterSpacing: '-0.01em',
                      lineHeight: 1.15,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  },
                  r.name,
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 4,
                    },
                  },
                  React.createElement(SemanticBadge, {
                    accent: 'muted',
                    variant: 'soft',
                  }, `${r.ingredients.length} ingredient${r.ingredients.length === 1 ? '' : 's'}`),
                  React.createElement(SemanticBadge, {
                    accent: 'muted',
                    variant: 'soft',
                  }, `${r.servings} serving${r.servings === 1 ? '' : 's'}`),
                ),
              ),
            ),
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 10,
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: '1px solid var(--knf-hairline)',
                },
              },
              React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 4,
                    fontFamily: 'var(--knf-font-mono)',
                  },
                },
                React.createElement(
                  'span',
                  {
                    style: {
                      fontSize: 24,
                      fontWeight: 700,
                      color: 'var(--knf-ink)',
                      fontVariantNumeric: 'tabular-nums slashed-zero',
                    },
                  },
                  perServing,
                ),
                React.createElement(
                  'span',
                  { style: { fontSize: 10, color: 'var(--knf-muted)' } },
                  'kcal / serving',
                ),
              ),
              React.createElement(
                'div',
                {
                  style: { display: 'flex', gap: 4, marginLeft: 'auto' },
                },
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: (e: any) => {
                      e.stopPropagation();
                      setEditing(r);
                    },
                    style: iconBtnStyle(),
                    title: 'Edit',
                  },
                  React.createElement(Pencil, {
                    style: { width: 14, height: 14 },
                  }),
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    onClick: (e: any) => {
                      e.stopPropagation();
                      if (
                        typeof window !== 'undefined' &&
                        window.confirm(`Delete recipe "${r.name}"?`)
                      ) {
                        deleteRecipe(r.id);
                      }
                    },
                    style: {
                      ...iconBtnStyle(),
                      color: 'var(--knf-alert)',
                    },
                    title: 'Delete',
                  },
                  React.createElement(Trash2, {
                    style: { width: 14, height: 14 },
                  }),
                ),
              ),
            ),
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  gap: 8,
                  marginTop: 10,
                  fontFamily: 'var(--knf-font-mono)',
                  fontSize: 10,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--knf-muted)',
                },
              },
              React.createElement(
                'span',
                { style: { color: SIG_PALETTE.protein } },
                `P ${Math.round(totalProtein / Math.max(r.servings, 1))}g`,
              ),
              React.createElement(
                'span',
                { style: { color: SIG_PALETTE.carbs } },
                `C ${Math.round(totalCarbs / Math.max(r.servings, 1))}g`,
              ),
              React.createElement(
                'span',
                { style: { color: SIG_PALETTE.fat } },
                `F ${Math.round(totalFat / Math.max(r.servings, 1))}g`,
              ),
            ),
          );
        }),
      ),
      editing !== null
        ? React.createElement(RecipeEditor, {
            recipe: editing === 'new' ? null : editing,
            onSave: async (r: Recipe) => {
              await getStorage().setRecipe(r);
              setEditing(null);
              await load();
              getApi().ui.showToast(`Saved "${r.name}"`, 'success');
            },
            onClose: () => setEditing(null),
          })
        : null,
    );
  }

  function TemplatesSectionImpl({
    openNewSignal,
  }: {
    openNewSignal: number;
  }) {
    const [templates, setTemplates] = React.useState<MealTemplate[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [editing, setEditing] = React.useState<MealTemplate | null>(null);
    const [createOpen, setCreateOpen] = React.useState(false);
    const [newName, setNewName] = React.useState('');
    const signalRef = React.useRef(openNewSignal);

    const load = React.useCallback(async () => {
      setLoading(true);
      const list = await getStorage().getAllTemplates();
      setTemplates(list);
      setLoading(false);
    }, []);

    React.useEffect(() => {
      load();
    }, [load]);

    React.useEffect(() => {
      if (openNewSignal !== signalRef.current) {
        signalRef.current = openNewSignal;
        setCreateOpen(true);
      }
    }, [openNewSignal]);

    const handleDelete = async (id: string) => {
      await getStorage().deleteTemplate(id);
      await load();
    };

    const applyToMeal = async (tmpl: MealTemplate, mealType: MealType) => {
      const s = getStorage();
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;
      const meal = await s.getMeal(dateKey, mealType);
      for (const item of tmpl.items) {
        meal.entries.push({
          id: uuid(),
          food: item.food,
          servings: item.servings,
        });
        await s.trackFoodUsage(item.food);
      }
      await s.setMeal(dateKey, mealType, meal);
      getApi().ui.showToast(
        `Applied “${tmpl.name}” to ${MEAL_LABELS[mealType]}`,
        'success',
      );
    };

    const createTemplate = async () => {
      if (!newName.trim()) return;
      const t: MealTemplate = {
        id: uuid(),
        name: newName.trim(),
        items: [],
      };
      await getStorage().setTemplate(t);
      setNewName('');
      setCreateOpen(false);
      setEditing(t);
    };

    if (loading) {
      return React.createElement(
        'div',
        { style: { padding: 32, color: 'var(--knf-muted)', fontSize: 13 } },
        'Loading templates…',
      );
    }

    const createDialog = React.createElement(
      Dialog,
      { open: createOpen, onOpenChange: setCreateOpen },
      React.createElement(
        DialogContent,
        { style: { maxWidth: 420 } },
        React.createElement(
          DialogHeader,
          null,
          React.createElement(DialogTitle, null, 'Create meal template'),
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          React.createElement(
            Label,
            { style: { fontSize: 11, color: 'var(--knf-muted)' } },
            'TEMPLATE NAME',
          ),
          React.createElement(Input, {
            value: newName,
            onChange: (e: any) => setNewName(e.target.value),
            placeholder: 'e.g. My Breakfast',
            autoFocus: true,
            className: 'h-9',
          }),
        ),
        React.createElement(
          DialogFooter,
          null,
          React.createElement(
            Button,
            { variant: 'outline', onClick: () => setCreateOpen(false) },
            'Cancel',
          ),
          React.createElement(
            Button,
            { onClick: createTemplate, disabled: !newName.trim() },
            'Create',
          ),
        ),
      ),
    );

    const editorNode = editing
      ? React.createElement(TemplateEditor, {
          template: editing,
          onSave: async (t: MealTemplate) => {
            await getStorage().setTemplate(t);
            setEditing(null);
            await load();
            getApi().ui.showToast(`Saved “${t.name}”`, 'success');
          },
          onClose: () => setEditing(null),
        })
      : null;

    if (templates.length === 0) {
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(EmptyState, {
          icon: 'BookmarkPlus',
          title: 'No meal templates yet',
          description:
            'Save common meals once, apply them to today’s diary in a single click.',
          actionLabel: 'New template',
          actionIcon: 'Plus',
          action: () => setCreateOpen(true),
        }),
        createDialog,
        editorNode,
      );
    }

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(SectionHeader, {
        count: templates.length,
        label: 'TEMPLATES',
      }),
      React.createElement(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          },
        },
        ...templates.map((t) => {
          const totalCal = t.items.reduce(
            (s, it) => s + it.food.calories * it.servings,
            0,
          );
          return React.createElement(
            SignatureCard,
            {
              key: t.id,
              padding: 'md',
              interactive: true,
              accent: 'hero',
            },
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 10,
                },
              },
              React.createElement(
                'div',
                { style: { flex: 1, minWidth: 0 } },
                React.createElement(
                  'div',
                  {
                    className: 'knf-display',
                    style: {
                      fontSize: 'var(--knf-text-h5)',
                      fontWeight: 600,
                      color: 'var(--knf-ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  },
                  t.name,
                ),
                React.createElement(
                  'div',
                  {
                    style: {
                      fontSize: 11,
                      color: 'var(--knf-muted)',
                      fontFamily: 'var(--knf-font-mono)',
                    },
                  },
                  `${t.items.length} item${t.items.length === 1 ? '' : 's'}`,
                ),
              ),
            ),
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 4,
                  fontFamily: 'var(--knf-font-mono)',
                  padding: '8px 0',
                },
              },
              React.createElement(
                'span',
                {
                  style: {
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--knf-ink)',
                    fontVariantNumeric: 'tabular-nums slashed-zero',
                  },
                },
                Math.round(totalCal),
              ),
              React.createElement(
                'span',
                { style: { fontSize: 10, color: 'var(--knf-muted)' } },
                'kcal total',
              ),
            ),
            React.createElement(
              'div',
              {
                style: {
                  display: 'flex',
                  gap: 6,
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid var(--knf-hairline)',
                },
              },
              React.createElement(
                DropdownMenu,
                null,
                React.createElement(
                  DropdownMenuTrigger,
                  { asChild: true },
                  React.createElement(
                    Button,
                    {
                      size: 'sm',
                      className: 'flex-1 h-8 text-xs gap-1',
                      disabled: t.items.length === 0,
                    },
                    React.createElement(Copy, {
                      style: { width: 12, height: 12 },
                    }),
                    'Use',
                  ),
                ),
                React.createElement(
                  DropdownMenuContent,
                  { align: 'start' },
                  React.createElement(
                    DropdownMenuLabel,
                    null,
                    'Apply to today',
                  ),
                  React.createElement(DropdownMenuSeparator, null),
                  ...MEAL_TYPES.map((mt: MealType) =>
                    React.createElement(
                      DropdownMenuItem,
                      {
                        key: mt,
                        onClick: () => applyToMeal(t, mt),
                      },
                      MEAL_LABELS[mt],
                    ),
                  ),
                ),
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => setEditing(t),
                  style: iconBtnStyle(),
                  title: 'Edit',
                },
                React.createElement(Pencil, {
                  style: { width: 14, height: 14 },
                }),
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    if (
                      typeof window !== 'undefined' &&
                      window.confirm(`Delete template "${t.name}"?`)
                    ) {
                      handleDelete(t.id);
                    }
                  },
                  style: {
                    ...iconBtnStyle(),
                    color: 'var(--knf-alert)',
                  },
                  title: 'Delete',
                },
                React.createElement(Trash2, {
                  style: { width: 14, height: 14 },
                }),
              ),
            ),
          );
        }),
      ),
      createDialog,
      editorNode,
    );
  }
}

// ---------------------------------------------------------------
// Small helper: shared icon-button styling
// ---------------------------------------------------------------
function iconBtnStyle(): any {
  return {
    width: 28,
    height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    color: 'var(--knf-muted)',
    border: '1px solid var(--knf-hairline)',
    borderRadius: 'var(--knf-radius-sm)',
    cursor: 'pointer',
    transition:
      'background var(--knf-duration-1) var(--knf-ease), color var(--knf-duration-1) var(--knf-ease), border-color var(--knf-duration-1) var(--knf-ease)',
  };
}
