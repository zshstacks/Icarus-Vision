import axios from "axios";
import process from "process";

const api = axios.create({
  baseURL: process.PUBLIC.API.URL,
  withCredentials: true,
});

export default api;
