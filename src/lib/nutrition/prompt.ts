import type { Sex, ActivityLevel, Goal } from "./calc";

export function buildPlanPrompt(input: {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
  mealsPerDay: number;
  dislikes: string[];
  allergies: string[];
  targets: { calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number };
}) {
  const dislikes = input.dislikes?.length ? input.dislikes.join(", ") : "nenhum";
  const allergies = input.allergies?.length ? input.allergies.join(", ") : "nenhuma";

  // Lista branca de alimentos "comuns de supermercado"
  const allowed = {
    proteins: [
      "ovos",
      "peito de frango",
      "peru",
      "atum (lata ao natural)",
      "salmão",
      "carne de vaca",
      "carne de porco",
      "iogurte natural",
      "iogurte grego",
      "queijo fresco",
      "queijo cottage",
      "leite",
      "whey (opcional)"
    ],
    carbs: [
      "arroz",
      "massa",
      "batata",
      "batata doce",
      "pão integral",
      "pão",
      "aveia",
      "banana",
      "maçã",
      "wrap/tortilha"
    ],
    fats: [
      "azeite",
      "amêndoas",
      "nozes",
      "manteiga de amendoim",
      "abacate"
    ],
    veggies: [
      "alface",
      "tomate",
      "cenoura",
      "brócolos",
      "espinafres",
      "courgette",
      "pepino",
      "pimentos",
      "cebola"
    ]
  };

  // blacklist curta para evitar “alucinações”
  const forbidden = [
    "algodão",
    "bola de algodão",
    "sabão",
    "detergente",
    "plástico",
    "papel",
    "shampoo",
    "desinfetante",
    "bacalhau" // queres evitar por ser menos “simples”
  ];

  const system = `
És um nutricionista virtual. Tens de criar UM plano diário em pt-PT.
Responde SEMPRE com JSON válido (sem markdown, sem texto fora do JSON).
Não inventes targets — usa exatamente os targets fornecidos.
Usa quantidades em gramas (quantity_g). Mantém refeições simples, baratas e realistas de supermercado.
Respeita dislikes e alergias/intolerâncias.

REGRAS CRÍTICAS:
- Responde APENAS com JSON.
- Não uses \`\`\` nem markdown.
- Não escrevas texto antes nem depois do JSON.
- Todos os números devem ser inteiros (sem casas decimais).
- NÃO uses palavras/produtos não comestíveis.
`;

  const user = `
Dados do utilizador:
- sexo: ${input.sex}
- idade: ${input.age}
- altura_cm: ${input.heightCm}
- peso_kg: ${input.weightKg}
- atividade: ${input.activity}
- objetivo: ${input.goal}
- refeições por dia: ${input.mealsPerDay}
- dislikes: ${dislikes}
- alergias/intolerâncias: ${allergies}

Targets (OBRIGATÓRIO usar exatamente estes valores):
- calories_kcal: ${input.targets.calories_kcal}
- protein_g: ${input.targets.protein_g}
- carbs_g: ${input.targets.carbs_g}
- fat_g: ${input.targets.fat_g}

ALIMENTOS PERMITIDOS (USA APENAS ESTES OU SINÓNIMOS MUITO PRÓXIMOS):
- Proteínas: ${allowed.proteins.join(", ")}
- Carboidratos: ${allowed.carbs.join(", ")}
- Gorduras: ${allowed.fats.join(", ")}
- Vegetais: ${allowed.veggies.join(", ")}

ALIMENTOS PROIBIDOS (NUNCA USAR):
${forbidden.map((x) => `- ${x}`).join("\n")}

Instruções:
- Monta um plano diário com ${input.mealsPerDay} refeições.
- Cada refeição deve ter 2 a 4 itens.
- Inclui vegetais em pelo menos 2 refeições.
- Se o utilizador tem dislikes/alergias, evita completamente.
- Usa nomes simples (ex: "Pequeno-almoço", "Almoço", "Lanche", "Jantar").

Devolve um JSON com este formato (campos obrigatórios):
{
  "version": "1.0",
  "locale": "pt-PT",
  "targets": {...},
  "meals_per_day": ${input.mealsPerDay},
  "meal_distribution": [{"meal": "...","kcal": 0}, ...],
  "meals": [
    {
      "name": "...",
      "items": [{"food":"...","quantity_g": 0, "notes": ""}, ...],
      "estimated_macros": {"kcal":0,"protein_g":0,"carbs_g":0,"fat_g":0}
    }
  ],
  "swap_options": [],
  "rules": ["...", "..."],
  "warnings": ["Isto não substitui um nutricionista."]
}

ESTRUTURA OBRIGATÓRIA:
- Pequeno-almoço: proteína + carb + fruta
- Almoço: proteína + carb + vegetais + gordura (azeite ou nozes)
- Lanche: proteína (iogurte/queijo) + (carb opcional)
- Jantar: proteína + carb + vegetais + gordura

REGRAS PRO:
- Inclui pelo menos 1 fruta (banana ou maçã).
- Inclui azeite em pelo menos 1 refeição.
- Almoço e Jantar devem ter carboidratos.
- Não faças planos "secos" com poucas coisas.

IMPORTANTE (para passar validação):
- Garante que a soma de estimated_macros.kcal no dia fica entre 90% e 110% do total.
- Se estiver baixo, aumenta carboidratos (arroz/massa/batata/aveia/pão) e/ou adiciona azeite.
- Inclui azeite no Almoço e no Jantar (10g cada) para ajudar a bater calorias.

Se o total de kcal estiver abaixo do intervalo:
- aumenta carboidratos no Almoço e Jantar (arroz/massa/batata) para 250g–350g (cozinhado)
- adiciona azeite 10g no Almoço e 10g no Jantar
- adiciona aveia 60g no pequeno-almoço
- adiciona 1 banana (120g) ou 1 maçã (180g)

Regras de consistência:
- "meals" deve ter exatamente ${input.mealsPerDay} refeições.
- "meal_distribution" deve ter exatamente ${input.mealsPerDay} entradas.
- kcal/grams devem ser inteiros.
- estimated_macros por refeição devem ser plausíveis (aprox).
- A soma de estimated_macros.kcal de todas as refeições deve ficar entre 90% e 110% das calories_kcal.
- Em refeições principais (almoço/jantar), proteína deve ser >= 35g.
- Ovos devem ser representados em gramas (ex: 120g) e não em unidades.
- A soma de estimated_macros.kcal de todas as refeições deve ficar entre 90% e 110% das calories_kcal.
- Em refeições principais (Almoço/Jantar), estimated_macros.protein_g deve ser >= 35g.
- Ovos devem ser sempre representados em gramas (ex: "Ovos" quantity_g: 120) e nunca como unidades/valores tipo 2g.
- Vegetais devem ter no mínimo 100g quando aparecem numa refeição.

`;

  return { system: system.trim(), user: user.trim() };
}
