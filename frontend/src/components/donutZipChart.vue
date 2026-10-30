<template>
  <div class="w-1/2">
    <canvas class="p-10" ref="zipChart"></canvas>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount} from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

//define props (label and chartData)
const props = defineProps({
    label: {
      type: Array
    },
    chartData: {
      type: Array
    }
})

// ref replaces this.$refs.zipChart
const zipChart = ref (null)

// Chart instance is non-reactive, just a JavaScript
let chartInstance = null


// Removed await
onMounted(() => {
    chartInstance = new Chart(zipChart.value, {
      type: 'doughnut',
      data: {
        labels: props.label,
        datasets: [
          {
            borderWidth: 1,
            data: props.chartData // Updated this line
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Clients by Zip Code'
          }
        },
        responsive: true,
        maintainAspectRatio: true
      }
    })
  })

// watch() allows the chart to update through frequent changes
watch (
  () => [props.label, props.chartData],
  ([newLabels, newData]) => {
    if (!chartInstance) return
    chartInstance.data.labels = newLabels
    chartInstance.data.datasets[0].data = newData
    chartInstance.update()
  }
)

// Destroys the chart instance
onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})

</script>
