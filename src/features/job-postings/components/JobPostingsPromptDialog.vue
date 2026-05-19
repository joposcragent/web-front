<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  text: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

function close() {
  emit("update:modelValue", false);
}
</script>

<template>
  <v-dialog
    :model-value="props.modelValue"
    max-width="720"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <v-card>
      <v-card-title class="text-h6 font-weight-regular"
        >Промпт для генерации</v-card-title
      >
      <v-card-text class="content-dialog__body pa-4">
        <pre class="content-dialog__pre text-body-2 ma-0">{{ props.text }}</pre>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="close">Закрыть</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
