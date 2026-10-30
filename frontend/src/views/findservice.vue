<!-- This view shows a list of services. Users can search for services and click on a service to be redirected to another component that displays the service's details -->
<template>
  <main>
    <div>
      <!--Header-->
      <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
        Find Services
      </h1>
    </div>
    <div class="px-10 pt-20">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <h2 class="text-2xl font-bold">Search Service By</h2>
        <!-- Displays Service Name and Description selection -->
        <div class="flex flex-col">
          <select
            class="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            v-model="searchBy">
            <option value="Service Name">Service Name</option>
            <option value="Service Description">Service Description</option>
          </select>
        </div>
        <!--Display service name search field-->
        <div class="flex flex-col" v-if="searchBy === 'Service Name'">
          <label class="block">
            <input type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              v-model="name" v-on:keyup.enter="handleSubmitForm" placeholder="Enter service name" />
          </label>
        </div>
        <!--Display service description search field-->
        <div class="flex flex-col" v-if="searchBy === 'Service Description'">
          <label class="block">
            <input type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              v-model="description" v-on:keyup.enter="handleSubmitForm" placeholder="Enter service description" />
          </label>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <div></div>
        <div></div>
        <div class="mt-5 grid-cols-2">
          <!--Clear Search button-->
          <button class="mr-10 border border-red-700 bg-white text-red-700 rounded" @click="loadData" type="submit">
            Clear Search
          </button>
          <!--Search Service button-->
          <button class="bg-red-700 text-white rounded" @click="handleSubmitForm" type="submit">
            Search Service
          </button>
        </div>
      </div>
    </div>

    <hr class="mt-10 mb-10" />
    <!-- Display Found Data -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
      <!--List of Services table-->
      <div class="ml-10">
        <h2 class="text-2xl font-bold">List of Services</h2>
        <h3 class="italic">Click table row to view service details</h3>
      </div>
      <div class="flex flex-col col-span-2">
        <table class="min-w-full shadow-md rounded">
          <thead class="bg-gray-50 text-xl">
            <tr>
              <th class="p-4 text-left" style="width: 25%;">Service Name</th>
              <th class="p-4 text-left" style="width: 75%;">Service Description</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-300">
            <tr @click="$router.push({name: 'servicedetails', params: { id: service._id } })" 
            v-for="service in services" :key="service._id" class="cursor-pointer"
              :class="{ 'hoverRow': hoverId === service._id }" @mouseenter="hoverId = service._id"
              @mouseleave="hoverId = null">
              <td class="p-4 text-left">{{ service.name }}</td>
              <td class="p-4 text-left text-sm">{{ service.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

// Options to Composition API using script setup
<script setup>
import { ref, onMounted} from 'vue'
import { useRouter } from 'vue-router'
import { getServices, searchServices } from '../api/api'
import { useToast } from 'vue-toastification'

//Notifications
const toast = useToast()

// useRouter() replaces global $router
const router = useRouter()

//each data() becomes ref
//variable to hold the services for the organization
const services = ref(null)
// Parameters for search to occur
const searchBy = ref(null)
const name =  ref(null)
const description = ref(null)

// Defining service columns for the DataTable
const columns = [
  { label: 'Service Name', field: 'name', width: '25%' },
  { label: 'Service Description', field: 'description', width: '75%', cellClass: 'text-sm' }
]

// Opens the detailed page for clicked service
function openService(service) {
  router.push( {name: 'servicedetails', param: { id: service._id} } )
}


    // async function is a plain async function
    // method called when component is mounted
    async function loadData() {
      // Resets all the variables
      searchBy.value = ''
      name.value = ''
      description.value = ''

      // get list of services
      try {
        const response = await getServices();
        services.value = response;
      } catch (error) {
        toast.error(error)
      }
    }

    // async function is a plain async function
    // method called when user searches for a service
    async function handleSubmitForm() {
      // if user searches by service name
      if (searchBy.value === 'Service Name') {
        if (name.value) {
          try {
            const query = {
              searchBy: 'name',
              name: name.value
            }
            const response = await searchServices(query)
            services.value = response;
          } catch (error) {
            toast.error(error)
          }
        }
        // if user searches by service description
      } else if (searchBy.value === 'Service Description') {
        if (description.value) {
          try {
            const query = {
              searchBy: 'description',
              description: description.value
            }
            const response = await searchServices(query)
            services.value = response;
          } catch (error) {
            toast.error('Error searching services:', error)
          }
        }
      }
    }
 
    
// when component is mounted, load the data
onMounted(() => {
  loadData()
})
</script>
