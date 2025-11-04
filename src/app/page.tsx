'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface Service {
  id: string
  name: string
  category: string
  description: string | null
  is_base: boolean
  is_active: boolean
  sort_order: number
}

async function fetchServices(): Promise<Service[]> {
  try {
    const { data, error } = await supabase
      .from('services_master')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching services:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Failed to fetch services:', error)
    throw error
  }
}

async function saveIntake(submission: {
  client_name: string
  project_name: string
  notes: string | null
  selected_services: string[]
}) {
  try {
    const { data, error } = await supabase
      .from('website_service_intake')
      .insert([
        {
          client_name: submission.client_name,
          project_name: submission.project_name,
          notes: submission.notes || null,
          selected_services: submission.selected_services,
        },
      ])
      .select()

    if (error) {
      console.error('Error saving intake:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to save intake:', error)
    throw error
  }
}

export default function HomePage() {
  const [services, setServices] = useState<Service[]>([])
  const [clientName, setClientName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadServices()
  }, [])

  const loadServices = async () => {
    setIsLoading(true)
    try {
      const fetchedServices = await fetchServices()
      setServices(fetchedServices)
      
      // Pre-select all base services
      const baseServiceIds = fetchedServices
        .filter((service) => service.is_base)
        .map((service) => service.id)
      setSelectedServices(baseServiceIds)

      // Set first category accordion open by default
      const addOnServices = fetchedServices.filter((service) => !service.is_base && service.category)
      if (addOnServices.length > 0 && addOnServices[0].category) {
        const firstCategory = addOnServices[0].category
        setOpenAccordions({ [firstCategory]: true })
      }
    } catch (error) {
      setErrorMessage('Failed to load services. Please refresh the page.')
      console.error('Error loading services:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleService = (serviceId: string) => {
    setSelectedServices((prev) => {
      if (prev.includes(serviceId)) {
        return prev.filter((id) => id !== serviceId)
      } else {
        return [...prev, serviceId]
      }
    })
  }

  const toggleAccordion = (category: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  const handleSubmit = async () => {
    setSuccessMessage('')
    setErrorMessage('')

    if (!clientName.trim() || !projectName.trim()) {
      setErrorMessage('Please fill in all required fields.')
      return
    }

    setIsSubmitting(true)

    try {
      await saveIntake({
        client_name: clientName.trim(),
        project_name: projectName.trim(),
        notes: notes.trim() || null,
        selected_services: selectedServices,
      })

      setSuccessMessage('Thank you! Your intake form has been submitted successfully.')
      setClientName('')
      setProjectName('')
      setNotes('')
      
      const baseServiceIds = services
        .filter((service) => service.is_base)
        .map((service) => service.id)
      setSelectedServices(baseServiceIds)

      setTimeout(() => {
        setSuccessMessage('')
      }, 5000)
    } catch (error) {
      setErrorMessage('Failed to submit form. Please try again.')
      console.error('Error submitting form:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const baseServices = services.filter((service) => service.is_base)
  const addOnServices = services.filter((service) => !service.is_base)
  
  const servicesByCategory = addOnServices.reduce((acc, service) => {
    const category = service.category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(service)
    return acc
  }, {} as Record<string, Service[]>)

  const categories = Object.keys(servicesByCategory).sort()

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AppsRow Solutions LLP
          </h1>
          <p className="text-lg text-gray-600">Website Service Intake Form</p>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-gray-600">Loading services...</p>
            </div>
          ) : (
            <>
              {/* Client Info */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Client & Project Information</h2>
                
                <div>
                  <label htmlFor="client-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Client/Company Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="client-name"
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g., Stark Industries"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="project-name"
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g., New Website Launch"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes/Additional Details
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any specific requirements, goals, or comments..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition resize-y"
                  />
                </div>
              </div>

              {/* Base Services */}
              {baseServices.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900">Included Base Services</h2>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {baseServices.map((service) => (
                        <div key={service.id} className="flex items-center">
                          <div className="flex items-center justify-center w-5 h-5 bg-primary rounded border-2 border-primary mr-3 flex-shrink-0">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                          <label className="text-gray-700 cursor-not-allowed select-none">
                            {service.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Add-on Services */}
              {categories.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900">Add-on Services</h2>
                  <div className="space-y-3">
                    {categories.map((category) => {
                      const isOpen = openAccordions[category] || false
                      return (
                        <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleAccordion(category)}
                            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                          >
                            <h3 className="font-bold text-gray-900">{category}</h3>
                            <svg
                              className={`w-5 h-5 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                          
                          <div
                            className={`overflow-hidden transition-all duration-300 ease-in-out ${
                              isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                            }`}
                          >
                            <div className="p-4 space-y-3 bg-white">
                              {servicesByCategory[category].map((service) => {
                                const isChecked = selectedServices.includes(service.id)
                                return (
                                  <label
                                    key={service.id}
                                    className="flex items-center cursor-pointer group"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleService(service.id)}
                                      className="sr-only"
                                    />
                                    <div
                                      className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center transition-all ${
                                        isChecked
                                          ? 'bg-primary border-primary'
                                          : 'border-gray-300 group-hover:border-primary'
                                      }`}
                                    >
                                      {isChecked && (
                                        <svg
                                          className="w-3 h-3 text-white"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={3}
                                            d="M5 13l4 4L19 7"
                                          />
                                        </svg>
                                      )}
                                    </div>
                                    <span className="text-gray-700 group-hover:text-gray-900">
                                      {service.name}
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Messages */}
              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                  {errorMessage}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-primary text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors animate-scale-up"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Checklist'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

