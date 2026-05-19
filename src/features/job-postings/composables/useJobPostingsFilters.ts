import { reactive, ref } from "vue";

type StatusAxis = "preset" | "none" | "custom";
type Option = { title: string; value: string };

function initDraft(
  opts: Option[],
  draft: Record<string, boolean>,
  selected: string[],
) {
  for (const option of opts) {
    draft[option.value] = selected.includes(option.value);
  }
}

export function useJobPostingsFilters(params: {
  preset: () => "dashboard" | "all";
  evalOptions: Option[];
  responseOptions: Option[];
}) {
  const { preset, evalOptions, responseOptions } = params;

  const evalAxis = ref<StatusAxis>("preset");
  const evalCustomValues = ref<string[]>([]);
  const respAxis = ref<StatusAxis>("preset");
  const respCustomValues = ref<string[]>([]);

  const evalFilterMenu = ref(false);
  const respFilterMenu = ref(false);
  const evalDraft = reactive<Record<string, boolean>>({});
  const respDraft = reactive<Record<string, boolean>>({});

  function effectiveEvalQueryValues(): string[] {
    if (evalAxis.value === "preset") {
      return preset() === "dashboard" ? ["RELEVANT"] : [];
    }
    if (evalAxis.value === "none") return [];
    return [...evalCustomValues.value];
  }

  function effectiveRespQueryValues(): string[] {
    if (respAxis.value === "preset") {
      return preset() === "dashboard" ? ["NEW", "RESPONDED"] : [];
    }
    if (respAxis.value === "none") return [];
    return [...respCustomValues.value];
  }

  function openEvalFilterMenu() {
    initDraft(evalOptions, evalDraft, effectiveEvalQueryValues());
  }

  function openRespFilterMenu() {
    initDraft(responseOptions, respDraft, effectiveRespQueryValues());
  }

  function applyEvalFilter() {
    const selected = evalOptions
      .filter((o) => evalDraft[o.value])
      .map((o) => o.value);
    if (selected.length === 0) {
      evalAxis.value = "none";
    } else {
      evalAxis.value = "custom";
      evalCustomValues.value = selected;
    }
    evalFilterMenu.value = false;
  }

  function clearEvalFilter() {
    evalAxis.value = "none";
    evalFilterMenu.value = false;
  }

  function applyRespFilter() {
    const selected = responseOptions
      .filter((o) => respDraft[o.value])
      .map((o) => o.value);
    if (selected.length === 0) {
      respAxis.value = "none";
    } else {
      respAxis.value = "custom";
      respCustomValues.value = selected;
    }
    respFilterMenu.value = false;
  }

  function clearRespFilter() {
    respAxis.value = "none";
    respFilterMenu.value = false;
  }

  return {
    evalAxis,
    evalCustomValues,
    respAxis,
    respCustomValues,
    evalFilterMenu,
    respFilterMenu,
    evalDraft,
    respDraft,
    effectiveEvalQueryValues,
    effectiveRespQueryValues,
    openEvalFilterMenu,
    openRespFilterMenu,
    applyEvalFilter,
    clearEvalFilter,
    applyRespFilter,
    clearRespFilter,
  };
}
