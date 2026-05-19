<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  notesText: string;
  saving: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "update:notesText": [value: string];
  save: [];
}>();

function close() {
  emit("update:modelValue", false);
}

function save() {
  emit("save");
}
</script>

<template>
  <v-dialog
    :model-value="props.modelValue"
    max-width="560"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <v-card>
      <v-card-title class="text-h6 font-weight-regular">Заметка</v-card-title>
      <v-card-text class="pa-4">
        <v-textarea
          :model-value="props.notesText"
          label="Текст заметки"
          variant="outlined"
          rows="8"
          auto-grow
          hide-details="auto"
          @update:model-value="(value) => emit('update:notesText', value)"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Закрыть</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="props.saving"
          @click="save"
          >Сохранить</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
