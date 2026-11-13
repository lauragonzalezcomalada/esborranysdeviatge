import type { Trip } from "~/composables/useTripPlaces";

function dateFromInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateToInput(date: Date | null) {
  if (!date) {
    return "";
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function useTripShell() {
  const route = useRoute();
  const { t } = useI18n();
  const localePath = useLocalePath();
  const trip = useState<Trip | null>("trip-shell", () => null);
  const editMode = useState("trip-shell-editing", () => false);
  const user = useSupabaseUser();
  const canBeEdited = computed(() => {
    const ownerId = trip.value?.ownerId;
    const userId = (user.value as { sub?: string } | null)?.sub;
    return Boolean(ownerId && userId && ownerId === userId);
  });
  const editOpen = useState("trip-shell-edit-open", () => false);
  const draftName = useState("trip-shell-name", () => "");
  const draftDescription = useState("trip-shell-description", () => "");
  const draftStart = useState("trip-shell-start", () => "");
  const pageError = useState("trip-shell-error", () => "");
  const loadedId = useState("trip-shell-loaded-id", () => "");

  const tripId = computed(() => {
    const slug = route.params.slug;
    const value = Array.isArray(slug) ? slug[0] : slug;
    return value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      )
      ? value
      : "";
  });

  const planning = computed(() => route.path.endsWith("/planning"));

  const { loadTrip, updateTrip, deleteTrip } = useTripPlaces();

  async function refreshTrip(id: string) {
    const loaded = await loadTrip(id);
    trip.value = loaded;
  }

  function openEditor() {
    if (!trip.value || !canBeEdited.value) {
      return;
    }
    draftName.value = trip.value.name;
    draftDescription.value = trip.value.description;
    draftStart.value = dateToInput(trip.value.startDate);
    editOpen.value = true;
  }

  async function saveTripDetails() {
    const current = trip.value;
    const name = draftName.value.trim();
    if (!current || !name || !canBeEdited.value) {
      return;
    }
    current.name = name;
    current.description = draftDescription.value.trim();
    current.startDate = dateFromInput(draftStart.value);
    editOpen.value = false;
    try {
      await updateTrip(current);
      pageError.value = "";
    } catch (error) {
      pageError.value =
        error instanceof Error ? error.message : t("errors.saveTrip");
    }
  }

  async function removeTrip() {
    if (!trip.value || !canBeEdited.value) {
      return;
    }
    if (!confirm(t("trip.confirmDelete"))) {
      return;
    }
    await deleteTrip(trip.value.id);
    navigateTo(localePath("/"));
  }

  return {
    tripId,
    trip,
    editMode,
    canBeEdited,
    editOpen,
    draftName,
    draftDescription,
    draftStart,
    pageError,
    loadedId,
    planning,
    refreshTrip,
    openEditor,
    saveTripDetails,
    removeTrip,
  };
}
