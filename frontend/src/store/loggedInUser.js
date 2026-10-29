// This pinia store contains state with respect to whether a user is logged in 
import { defineStore } from 'pinia'
import { useToast } from 'vue-toastification'
import { loginUser, logoutUser, setAuthHeader } from '../api/api' // import API calls
import jwt_decode from 'jwt-decode'; // import JSON Web Token decoder to decode the token into the user's information

//Notifications
const toast = useToast()

// Defining a store
export const useLoggedInUserStore = defineStore({
  id: 'loggedInUser',
  state: () => {
    return {
      name: "",
      role: "",
      isLoggedIn: false
    }
  },
  actions: {

    restoreSession() {
  const token = localStorage.getItem("authToken");

  // No saved token means the user is logged out
  if (!token) {
    return;
  }

  try {
    const decodedToken = jwt_decode(token);

    // JWT expiration time is stored in seconds
    const currentTime = Date.now() / 1000;

    if (!decodedToken.exp || decodedToken.exp <= currentTime) {
      logoutUser();

      this.$patch({
        name: "",
        role: "",
        isLoggedIn: false
      });

      return;
    }

    // Restore the Axios Authorization header
    setAuthHeader(token);

    // Restore Pinia user state
    this.$patch({
      isLoggedIn: true,
      role: decodedToken.role,
      name: decodedToken.name
    });

  } catch (error) {
    // Corrupted/invalid token should result in a clean logout
    logoutUser();

    this.$patch({
      name: "",
      role: "",
      isLoggedIn: false
    });
  }
},

    async login(username, password) {
      try {
        const token = await loginUser(username, password);
        // Get the user's name and role from the JWT token
        const decodedToken = jwt_decode(token);
        this.$patch({
          isLoggedIn: true,
          role: decodedToken.role,
          name: decodedToken.name
        });
        this.$router.push("/");
        toast.success("Login Sucessful!")

      } catch ( error ) {
        toast.error(error.message)
      }
    },
    logout() {
      logoutUser();
      // Reset value after user log out
      this.$patch({
        name: "",
        role: "",
        isLoggedIn: false
      });
      this.$router.push("/");
      toast.info("You have been logged out!")
    }
  },
});
