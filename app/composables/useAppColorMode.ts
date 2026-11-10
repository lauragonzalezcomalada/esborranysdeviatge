export const colorModes = {
  "wild-nature": "🌳",
  psico: "📀",
  mnm: "🌚",
} as const;

export type AppColorMode = keyof typeof colorModes;

const defaultMode: AppColorMode = "wild-nature";
const replacedModes = ["light", "dark", ...Object.keys(colorModes)];

function isAppColorMode(value: string): value is AppColorMode {
  return Object.hasOwn(colorModes, value);
}

function applyColorMode(mode: AppColorMode) {
  if (!import.meta.client) return;

  const root = document.documentElement;
  root.classList.remove(...replacedModes);
  root.classList.add(mode);
}

export function useAppColorMode() {
  const colorMode = useColorMode();

  const mode = computed<AppColorMode>({
    get: () =>
      isAppColorMode(colorMode.preference) ? colorMode.preference : defaultMode,

    set: (value) => {
      colorMode.preference = value;
      applyColorMode(value);
    },
  });

  onMounted(() => {
    if (!isAppColorMode(colorMode.preference)) {
      colorMode.preference = defaultMode;
    }

    applyColorMode(mode.value);
  });

  if (import.meta.client) {
    watch(
      () => colorMode.preference,
      (value) => {
        if (isAppColorMode(value)) {
          applyColorMode(value);
        }
      },
    );
  }

  return { mode, modes: colorModes };
}
