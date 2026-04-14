import type { SharedDependencies, NormalizedFood, Recipe } from '../types';
import { getStorage, getApi } from '../hooks/use-fitness-store';
import { uuid } from '../utils/date-helpers';
import { formatCal, formatG } from '../utils/nutrients';
import { createFoodSearchDialog } from './food-search';
import { createEmptyState } from './empty-state';

export function createRecipeBuilder(Shared: SharedDependencies) {
  const {
    React, Card, CardContent, CardHeader, CardTitle,
    Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
    ScrollArea, Separator, lucideIcons, cn,
  } = Shared;
  const { Plus, Trash2, ChefHat, Pencil } = lucideIcons;

  const EmptyState = createEmptyState(Shared);

  function RecipeEditor({ recipe, onSave, onCancel }: {
    recipe: Recipe | null;
    onSave: (recipe: Recipe) => void;
    onCancel: () => void;
  }) {
    const [name, setName] = React.useState(recipe?.name ?? '');
    const [servings, setServings] = React.useState(String(recipe?.servings ?? 1));
    const [ingredients, setIngredients] = React.useState<{ food: NormalizedFood; servings: number }[]>(
      recipe?.ingredients ?? []
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
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );

    const numServings = parseInt(servings) || 1;
    const perServing = {
      calories: Math.round(totals.calories / numServings),
      protein_g: Math.round(totals.protein_g / numServings * 10) / 10,
      carbs_g: Math.round(totals.carbs_g / numServings * 10) / 10,
      fat_g: Math.round(totals.fat_g / numServings * 10) / 10,
    };

    const handleAddIngredient = (food: NormalizedFood, qty: number) => {
      setIngredients([...ingredients, { food, servings: qty }]);
    };

    const handleRemoveIngredient = (index: number) => {
      setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const handleSave = () => {
      const r: Recipe = {
        id: recipe?.id ?? uuid(),
        name: name.trim(),
        servings: numServings,
        ingredients,
        notes: notes.trim() || undefined,
      };
      onSave(r);
    };

    return React.createElement('div', { className: 'space-y-4' },
      React.createElement('div', { className: 'space-y-1' },
        React.createElement(Label, { className: 'text-xs' }, 'Recipe Name'),
        React.createElement(Input, {
          value: name, onChange: (e: any) => setName(e.target.value),
          placeholder: 'e.g. Chicken Stir Fry', className: 'h-8',
        }),
      ),
      React.createElement('div', { className: 'space-y-1' },
        React.createElement(Label, { className: 'text-xs' }, 'Number of Servings'),
        React.createElement(Input, {
          type: 'number', min: 1, value: servings,
          onChange: (e: any) => setServings(e.target.value),
          className: 'h-8 w-24',
        }),
      ),

      React.createElement(Separator, null),

      // Ingredients list
      React.createElement('div', null,
        React.createElement('div', { className: 'flex items-center justify-between mb-2' },
          React.createElement(Label, { className: 'text-xs' }, `Ingredients (${ingredients.length})`),
          React.createElement(Button, {
            variant: 'outline', size: 'sm', className: 'h-7 text-xs',
            onClick: () => setSearchOpen(true),
          },
            React.createElement(Plus, { className: 'h-3 w-3 mr-1' }),
            'Add Ingredient',
          ),
        ),
        ingredients.length > 0
          ? React.createElement('div', { className: 'space-y-1' },
              ...ingredients.map((ing, i) =>
                React.createElement('div', {
                  key: i,
                  className: 'flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 group',
                },
                  React.createElement('div', { className: 'flex-1 min-w-0' },
                    React.createElement('div', { className: 'text-sm truncate' }, ing.food.name),
                    React.createElement('div', { className: 'text-xs text-muted-foreground' },
                      `${ing.servings} × ${ing.food.serving_label} · ${Math.round(ing.food.calories * ing.servings)} cal`),
                  ),
                  React.createElement(Button, {
                    variant: 'ghost', size: 'icon',
                    className: 'h-7 w-7 opacity-0 group-hover:opacity-100',
                    onClick: () => handleRemoveIngredient(i),
                  }, React.createElement(Trash2, { className: 'h-3.5 w-3.5 text-destructive' })),
                ),
              ),
            )
          : React.createElement('div', { className: 'text-sm text-muted-foreground text-center py-4' },
              'No ingredients yet. Add foods to build your recipe.'),
      ),

      // Per-serving nutrition
      ingredients.length > 0 && React.createElement(React.Fragment, null,
        React.createElement(Separator, null),
        React.createElement('div', { className: 'text-xs text-muted-foreground mb-1' }, 'Per serving'),
        React.createElement('div', { className: 'grid grid-cols-4 gap-2 text-center' },
          React.createElement('div', null,
            React.createElement('div', { className: 'text-sm font-bold' }, formatCal(perServing.calories)),
            React.createElement('div', { className: 'text-[10px] text-muted-foreground' }, 'cal'),
          ),
          React.createElement('div', null,
            React.createElement('div', { className: 'text-sm font-bold text-blue-500' }, formatG(perServing.protein_g)),
            React.createElement('div', { className: 'text-[10px] text-muted-foreground' }, 'protein'),
          ),
          React.createElement('div', null,
            React.createElement('div', { className: 'text-sm font-bold text-amber-500' }, formatG(perServing.carbs_g)),
            React.createElement('div', { className: 'text-[10px] text-muted-foreground' }, 'carbs'),
          ),
          React.createElement('div', null,
            React.createElement('div', { className: 'text-sm font-bold text-red-500' }, formatG(perServing.fat_g)),
            React.createElement('div', { className: 'text-[10px] text-muted-foreground' }, 'fat'),
          ),
        ),
      ),

      React.createElement('div', { className: 'flex gap-2 pt-2' },
        React.createElement(Button, { variant: 'outline', className: 'flex-1', onClick: onCancel }, 'Cancel'),
        React.createElement(Button, {
          className: 'flex-1', disabled: !name.trim() || ingredients.length === 0,
          onClick: handleSave,
        }, recipe ? 'Update Recipe' : 'Save Recipe'),
      ),

      // Reuse the food search dialog for adding ingredients
      React.createElement(createFoodSearchDialog(Shared), {
        open: searchOpen,
        onOpenChange: setSearchOpen,
        mealType: 'breakfast', // unused but required
        onAddFood: handleAddIngredient,
      }),
    );
  }

  return function RecipeBuilderPage() {
    const [recipes, setRecipes] = React.useState<Recipe[]>([]);
    const [editing, setEditing] = React.useState<Recipe | null | 'new'>(null);
    const [loading, setLoading] = React.useState(true);

    const load = React.useCallback(async () => {
      setLoading(true);
      const r = await getStorage().getAllRecipes();
      setRecipes(r);
      setLoading(false);
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const handleSave = async (recipe: Recipe) => {
      await getStorage().setRecipe(recipe);
      setEditing(null);
      await load();
      getApi().ui.showToast(`Recipe "${recipe.name}" saved`, 'success');
    };

    const handleDelete = async (id: string) => {
      await getStorage().deleteRecipe(id);
      await load();
    };

    if (editing) {
      return React.createElement('div', { className: 'max-w-md mx-auto' },
        React.createElement(RecipeEditor, {
          recipe: editing === 'new' ? null : editing,
          onSave: handleSave,
          onCancel: () => setEditing(null),
        }),
      );
    }

    return React.createElement('div', { className: 'space-y-4' },
      React.createElement('div', { className: 'flex items-center justify-between' },
        React.createElement('h2', { className: 'text-lg font-semibold flex items-center gap-2' },
          React.createElement(ChefHat, { className: 'h-5 w-5' }),
          'Recipes',
        ),
        React.createElement(Button, { size: 'sm', onClick: () => setEditing('new') },
          React.createElement(Plus, { className: 'h-4 w-4 mr-1' }),
          'New Recipe',
        ),
      ),

      loading
        ? React.createElement('div', { className: 'text-sm text-muted-foreground text-center py-8' }, 'Loading...')
        : recipes.length === 0
        ? React.createElement(EmptyState, {
            icon: 'ChefHat',
            title: 'No recipes yet',
            description: 'Build multi-ingredient meals and save them for quick logging later.',
            action: { label: 'New Recipe', iconName: 'Plus', onClick: () => setEditing('new') },
          })
        : React.createElement('div', { className: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' },
            ...recipes.map(recipe => {
              const totalCal = recipe.ingredients.reduce((sum, ing) => sum + ing.food.calories * ing.servings, 0);
              const perServing = Math.round(totalCal / (recipe.servings || 1));

              return React.createElement(Card, { key: recipe.id, className: 'group hover:border-primary/40 transition-colors' },
                React.createElement(CardContent, { className: 'p-3 flex flex-col gap-2' },
                  React.createElement('div', { className: 'flex items-start justify-between gap-2' },
                    React.createElement('div', { className: 'flex-1 min-w-0' },
                      React.createElement('div', { className: 'text-sm font-medium truncate' }, recipe.name),
                      React.createElement('div', { className: 'text-[10px] text-muted-foreground tabular-nums' },
                        `${recipe.ingredients.length} ingredient${recipe.ingredients.length === 1 ? '' : 's'} \u00b7 ${recipe.servings} serving${recipe.servings === 1 ? '' : 's'}`),
                    ),
                    React.createElement('div', { className: 'flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity' },
                      React.createElement(Button, {
                        variant: 'ghost', size: 'icon', className: 'h-6 w-6',
                        onClick: () => setEditing(recipe),
                      }, React.createElement(Pencil, { className: 'h-3 w-3' })),
                      React.createElement(Button, {
                        variant: 'ghost', size: 'icon', className: 'h-6 w-6',
                        onClick: () => handleDelete(recipe.id),
                      }, React.createElement(Trash2, { className: 'h-3 w-3 text-destructive' })),
                    ),
                  ),
                  React.createElement('div', { className: 'text-xl font-bold tabular-nums' },
                    perServing,
                    React.createElement('span', { className: 'text-[10px] font-normal text-muted-foreground ml-1' }, 'cal/serving'),
                  ),
                ),
              );
            }),
          ),
    );
  };
}
