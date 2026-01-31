import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mznbwaefknjnpdyvhdqa.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16bmJ3YWVma25qbnBkeXZoZHFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NTkzMzMsImV4cCI6MjA4NTQzNTMzM30.lKb9Rn-lvTvugmcHNPmEWRumnjhoaNIpSO_kwCNq6e0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)