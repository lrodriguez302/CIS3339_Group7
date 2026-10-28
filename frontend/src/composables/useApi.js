import { ref } from "vue";

export function useApi(apiCall) {
  const data = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const execute = async (...args) => {
    loading.value = true;
    error.value = null;

    try {
      data.value = await apiCall(...args);
      return data.value;
    } catch (err) {
      error.value =
        err?.message ||
        err?.response?.data?.message ||
        "An unexpected error occurred.";

      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    data,
    loading,
    error,
    execute,
  };
}