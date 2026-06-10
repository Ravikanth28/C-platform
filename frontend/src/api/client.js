import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global response error handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Download a file from an authenticated endpoint (sends the JWT, then saves the blob)
export const downloadFile = async (url, filename) => {
  const res = await api.get(url, { responseType: 'blob' })
  const blobUrl = URL.createObjectURL(new Blob([res.data]))
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(blobUrl)
}

export const getFileUrl = (url) => {
  if (!url) return url
  if (url.startsWith('/uploads')) {
    const apiBase = import.meta.env.VITE_API_URL || '/api'
    const base = apiBase.replace(/\/api\/?$/, '')
    return `${base}${url}`
  }
  return url
}

export default api
