<template>
  <div>
    <canvas class="p-10" ref="attendanceChart"></canvas>
  </div>
</template>

<!-- Changing from Options API to Composition API using <script setup> -->
<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Chart, registerables } from 'chart.js'
import { Colors } from 'chart.js';

Chart.register(...registerables)
Chart.register(Colors);

// Replaced the Options API (export default) with Composition API  
const props = defineProps ({
  label: {
    type: Array
  },
  chartData:{
    type: Array
  }
}
)

// Replaced this.$refs.attendanceChart within the code
const attendanceChart = ref(null)

// Holds the instance value of Chart.js to be updated and destroyed later.
let chartInstance = null


// The old code does not update the chart when new data comes. Replacing await with 'chartInstance' draws the chart and shows results.
onMounted(() => {
    chartInstance = new Chart(attendanceChart.value, {
      type: 'bar',
      data: {
        labels: label.value,
        datasets: [
          {
            borderWidth: 1,
            data: chartData.value
          }
        ]
      },
      options: {
        scales: {
          y: {
            ticks: {
              stepSize: 1
            }
          },
          x: {
            gridLines: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Attendance Chart'
          }
        },
        responsive: true,
        maintainAspectRatio: true
      }
    })
  })

// The Options API never change the chart, so when new data is implemented. 
// watch() draws the new chart when data is changed.
watch(
  () => [props.label, props.chartData],
  ([newLabels, newData]) => {
    if (!chartInstance) return
    chartInstance.data.labels = newLabels
    chartInstance.data.datasets[0].data = newData
    chartInstance.update()
  }
)

// The Options API never destroys the chart
onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})

</script>

