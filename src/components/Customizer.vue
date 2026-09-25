<script setup lang="ts">
import BotTile from '@/components/BotTile.vue'
import { DEFAULT_EXPRESSION, EXPRESSIONS, type ExpressionId } from '@/bot/expressions'
import { DUCK_STYLES, type DuckStyle } from '@/bot/skins'
import { t } from '@/i18n'

defineProps<{ shape: string; color: string }>()
const duckStyle = defineModel<DuckStyle>('duckStyle', { required: true })
const expression = defineModel<string>('expression', { required: true })

function selectStyle(style: DuckStyle) {
  duckStyle.value = style
  expression.value = DEFAULT_EXPRESSION
}

function selectExpression(id: ExpressionId) {
  duckStyle.value = 'normal'
  expression.value = id
}

/**
 * Les vignettes sont figees a la meme date que la pose de repos : elles montrent
 * la forme et le visage tels qu'ils apparaitront, pas un aplat abstrait.
 */
const PREVIEW_AT = 1
</script>

<template>
  <div>
    <h2 class="text-sm font-semibold">{{ t('panel.duckStyle') }}</h2>
    <div class="mt-2 grid grid-cols-3 gap-1.5">
      <BotTile
        v-for="style in DUCK_STYLES"
        :key="style"
        :label="t(`ducks.${style}`)"
        :selected="style === duckStyle"
        :duck-style="style"
        :shape="shape"
        :color="color"
        :size="84"
        :frozen-at="PREVIEW_AT"
        @click="selectStyle(style)"
      />
    </div>

    <h2 class="mt-6 text-sm font-semibold">{{ t('panel.expression') }}</h2>
    <div class="mt-2 grid grid-cols-4 gap-1.5">
      <BotTile
        v-for="item in EXPRESSIONS"
        :key="item.id"
        :label="t(`expressions.${item.id}`)"
        :selected="item.id === expression"
        duck-style="normal"
        :expression="item.id"
        :size="60"
        :frozen-at="PREVIEW_AT"
        @click="selectExpression(item.id)"
      />
    </div>
  </div>
</template>
