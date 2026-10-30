<!--
  DataTable - one reusable table for the client, event and service list views.

  Before this component, findclient.vue, findevents.vue and findservice.vue each
  had their own almost identical <table> markup, plus duplicated row-hover logic.
  Now each view only describes its columns and hands over its rows.

  Props
    columns: array of column definitions, each one
      { label: 'Name',            // text shown in the header
        field: 'address.city',    // key into the row (dot paths allowed); also used for sorting
        render: (row) => '...' }  // optional - custom text for the cell
    rows: array of row objects (the data already loaded by the page)
    rowKey: property that uniquely identifies a row (default '_id')
    pageSize: rows per page (default 10)

  Events
    row-click(row): fired when a row is clicked or activated with Enter

  Sorting and pagination happen on the client side, on the rows passed in.
-->
<template>
  <div>
    <table class="min-w-full shadow-md rounded">
      <thead class="bg-gray-50 text-xl">
        <tr>
          <!-- Clicking a header cycles: ascending -> descending -> unsorted -->
          <th
            v-for="column in columns"
            :key="column.field"
            class="p-4 text-left cursor-pointer select-none"
            :style="column.width ? { width: column.width } : null"
            :aria-sort="ariaSort(column.field)"
            @click="toggleSort(column.field)"
          >
            {{ column.label }}
            <span class="text-sm text-gray-500" aria-hidden="true">{{ sortIndicator(column.field) }}</span>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-300">
        <!-- Rows for the current page only -->
        <tr
          v-for="row in pagedRows"
          :key="row[rowKey]"
          class="cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-700"
          :class="{ hoverRow: hoverId === row[rowKey] }"
          tabindex="0"
          @click="emit('row-click', row)"
          @keyup.enter="emit('row-click', row)"
          @mouseenter="hoverId = row[rowKey]"
          @mouseleave="hoverId = null"
        >
          <td v-for="column in columns" :key="column.field" class="p-2 text-left" :class="column.cellClass">
            {{ cellText(row, column) }}
          </td>
        </tr>

        <!-- Shown when there is nothing to display -->
        <tr v-if="totalRows === 0">
          <td :colspan="columns.length" class="p-4 text-center text-gray-500 italic">No results</td>
        </tr>
      </tbody>
    </table>

    <!-- Pagination controls -->
    <div class="flex items-center justify-between mt-4">
      <p class="text-gray-700">Showing {{ firstShown }}-{{ lastShown }} of {{ totalRows }}</p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="border border-red-700 bg-white text-red-700 rounded disabled:opacity-50"
          :disabled="currentPage <= 1"
          @click="currentPage--"
        >
          Previous
        </button>
        <span class="text-gray-700">Page {{ currentPage }} of {{ totalPages }}</span>
        <button
          type="button"
          class="border border-red-700 bg-white text-red-700 rounded disabled:opacity-50"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  columns: {
    type: Array,
    required: true
  },
  rows: {
    // null is allowed so a page can pass its data before it has loaded
    type: Array,
    default: () => []
  },
  rowKey: {
    type: String,
    default: '_id'
  },
  pageSize: {
    type: Number,
    default: 10
  }
})

const emit = defineEmits(['row-click'])

// ID of the row under the mouse (highlights the row, as the old tables did)
const hoverId = ref(null)

// Current sort: which field, and 'asc' | 'desc' | null (null = original order)
const sortField = ref(null)
const sortDirection = ref(null)

// 1-based page number
const currentPage = ref(1)

// Reads a value from a row, following dot paths like 'address.city'
function getValue(row, field) {
  return field.split('.').reduce((value, key) => (value == null ? value : value[key]), row)
}

// Text shown in a cell: the column's render function if it has one, otherwise the raw value
function cellText(row, column) {
  if (column.render) return column.render(row)
  const value = getValue(row, column.field)
  return value == null ? '' : value
}

// Header click: asc -> desc -> unsorted. Clicking a different column starts at asc.
function toggleSort(field) {
  if (sortField.value !== field) {
    sortField.value = field
    sortDirection.value = 'asc'
  } else if (sortDirection.value === 'asc') {
    sortDirection.value = 'desc'
  } else {
    sortField.value = null
    sortDirection.value = null
  }
  // A new order means the old page position no longer makes sense
  currentPage.value = 1
}

function sortIndicator(field) {
  if (sortField.value !== field) return ''
  return sortDirection.value === 'asc' ? '▲' : '▼'
}

// Lets screen readers announce the sort state
function ariaSort(field) {
  if (sortField.value !== field) return 'none'
  return sortDirection.value === 'asc' ? 'ascending' : 'descending'
}

// Compares two cell values; empty values always go last
function compareValues(a, b) {
  const aEmpty = a == null || a === ''
  const bEmpty = b == null || b === ''
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  // numeric: true sorts "Event 2" before "Event 10"; ISO dates also sort correctly as strings
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

// All rows in the chosen order (a copy, so the parent's array is never changed)
const sortedRows = computed(() => {
  const rows = [...(props.rows || [])]
  if (!sortField.value) return rows
  const direction = sortDirection.value === 'asc' ? 1 : -1
  return rows.sort((a, b) => direction * compareValues(getValue(a, sortField.value), getValue(b, sortField.value)))
})

const totalRows = computed(() => sortedRows.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / props.pageSize)))

// Only the rows for the current page are rendered
const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize
  return sortedRows.value.slice(start, start + props.pageSize)
})

// Numbers for "Showing X-Y of Z" (0-0 of 0 when empty)
const firstShown = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * props.pageSize + 1))
const lastShown = computed(() => Math.min(currentPage.value * props.pageSize, totalRows.value))

// When the page loads new rows (a search, or Clear Search), go back to page 1.
// Without this, being on page 3 and then searching could show an empty page
// or rows left over from the previous list.
watch(
  () => props.rows,
  () => {
    currentPage.value = 1
    hoverId.value = null
  }
)

// Safety net: never stay on a page that no longer exists
watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages
})
</script>