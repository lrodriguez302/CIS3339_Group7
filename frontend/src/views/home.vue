<!-- This is the home view - which shows a dashboard -->
<template>
  <main>
    <div>
      <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
        Dashboard
      </h1>
      <br />
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <div class="ml-10"></div>
        <div class="flex flex-col col-span-2">
          <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
              Events Attendance
          </h1>
      
          <div v-if="!recentEvents.length" class="flex justify-center mt-10">No events found.</div>
          <table v-if="recentEvents.length" class="min-w-full shadow-md rounded">
            <thead class="bg-gray-50 text-xl">
              <tr class="p-4 text-left">
                <th class="p-4 text-left">Event Name</th>
                <th class="p-4 text-left">Event Date</th>
                <th class="p-4 text-left">Number of Attendees</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-300"> 
              <tr
                @click="editEvent(event._id)"
                v-for="event in recentEvents"
                :key="event._id"
              >
                <td class="p-2 text-left">{{ event.name }}</td>
                <td class="p-2 text-left">{{ formatDate(event.date) }}</td>
                <td class="p-2 text-left">{{ event.attendees.length }}</td>
              </tr>
            </tbody>
          </table>
          
          <div v-if="recentEvents.length">
            <AttendanceChart
              v-if="!loading && !error"
              :label="labels"
              :chart-data="chartData"
            ></AttendanceChart>

            <!-- Start of loading animation -->
            <div class="mt-40" v-if="loading">
              <p
                class="text-6xl font-bold text-center text-gray-500 animate-pulse"
              >
                Loading...
              </p>
            </div>
            <!-- End of loading animation -->

            <!-- Start of error alert -->
            <div class="mt-12 bg-red-50" v-if="error">
              <h3 class="px-4 py-1 text-4xl font-bold text-white bg-red-800">
                {{ error.title }}
              </h3>
              <p class="p-4 text-lg font-bold text-red-900">
                {{ error.message }}
              </p>
            </div>
            <!-- End of error alert -->
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <div class="ml-10"></div>
        <div class="flex flex-col col-span-2">
          <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
              Clients by Zip Code
          </h1>
          
          <div v-if="!zips.length" class="flex justify-center mt-10">No clients found.</div>
          <table v-if="zips.length" class="min-w-full shadow-md rounded">
            <thead class="bg-gray-50 text-xl">
              <tr class="p-4 text-left">
                <th class="p-4 text-left">Zip Number</th>
                <th class="p-4 text-left">Client Count</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-300">
              <tr
                v-for="zip in zips"
                :key="zip._id"
              >
                <td class="p-2 text-left">{{ zip._id }}</td>
                <td class="p-2 text-left">{{ zip.count }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="zips.length" class="flex justify-center mt-10">
            <ZipChart
              v-if="!zipLoading && !zipError"
              :label="zipLabels"
              :chart-data="zipChartData"
            ></ZipChart>

            <!-- Start of loading animation -->
            <div class="mt-40" v-if="zipLoading">
              <p
                class="text-6xl font-bold text-center text-gray-500 animate-pulse"
              >
                Loading...
              </p>
            </div>
            <!-- End of loading animation -->

            <!-- Start of error alert -->
            <div class="mt-12 bg-red-50" v-if="zipError">
              <h3 class="px-4 py-1 text-4xl font-bold text-white bg-red-800">
                {{ zipError.title }}
              </h3>
              <p class="p-4 text-lg font-bold text-red-900">
                {{ zipError.message }}
              </p>
            </div>
            <!-- End of error alert -->
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AttendanceChart from '../components/barChart.vue'
import ZipChart from '../components/donutZipChart.vue'
import { getAttendance, getClientsByZipCode } from '../api/api'

// Formats an ISO date (e.g. "2026-03-15T00:00:00.000Z") as MM/DD/YYYY
function formatDate(date) {
  const isoDate = new Date(date)
  const year = isoDate.getUTCFullYear()
  const month = String(isoDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(isoDate.getUTCDate()).padStart(2, '0')
  return `${month}/${day}/${year}`
}

const router = useRouter()


// data property becomes ref
const recentEvents = ref([])
const zips = ref([])
const labels = ref([])
const chartData = ref([])
const zipLabels = ref([])
const zipChartData = ref([])
const loading = ref(false)
const error = ref(null)
const zipLoading = ref(false)
const zipError = ref(null)


function toErrorInfo(err) {
  if (err.response) {
    // client receives an error response (5xx, 4xx)
    return {title: 'Server Response', message: err.message }
  } else if (err.request) {
    // client never received a response, or request never left
    return { title: 'Unable to reach server', message: err.message }
  }
  // Error within code
  return { title: 'App Error', message: err.message }
}



// method is now a plain async function
async function getAttendanceData() {
      try {
        error.value = null
        loading.value = true
        
        const attendance = await getAttendance();
        recentEvents.value = attendance;
        labels.value = attendance.map(
          (item) => `${item.name} (${formatDate(item.date)})`
        )
        chartData.value = attendance.map((item) => item.attendees.length)
      } catch (err) {
        error.value = toErrorInfo(err)
    
      }
      loading.value = false
  }


// methods.getZipData --> plain async function
async function getZipData() {
      try {
        zipError.value = null
        zipLoading.value = true
        
        const zipdata = await getClientsByZipCode();
        zips.value = zipdata;
        zipLabels.value = zipdata.map((item) => item._id)
        zipChartData.value = zipdata.map((item) => item.count)
      } catch (err) {
        zipError.value = toErrorInfo(err)
      }
      zipLoading.value = false
    }

// Options API never defined editEvent(), therefore clicking a row results into an error.
function editEvent(eventId) {
  router.push({ name: 'eventdetails', params: { id: eventId } } ) 
  }

// mounted() -> onMounted()
onMounted (() => {
  getAttendanceData()
  getZipData()
})

</script>
