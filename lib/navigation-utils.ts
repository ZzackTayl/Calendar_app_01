import { useRouter } from 'next/navigation'

// Define the hierarchical navigation structure
const navigationHierarchy: Record<string, string> = {
  // Dashboard is the root
  '/': '/',
  
  // Main sections
  '/calendar': '/',
  '/events': '/',
  '/relationships': '/',
  '/contacts': '/',
  '/groups': '/',
  '/settings': '/',
  '/sharing': '/',
  
  // Event pages
  '/events/create': '/events',
  '/events/[id]': '/events',
  '/events/[id]/edit': '/events/[id]',
  
  // Relationship pages
  '/relationships/add': '/relationships',
  '/relationships/[id]': '/relationships',
  '/relationships/[id]/edit': '/relationships/[id]',
  
  // Contact pages
  '/contacts/create': '/contacts',
  '/contacts/[id]': '/contacts',
  '/contacts/[id]/edit': '/contacts/[id]',
  
  // Group pages
  '/groups/create': '/groups',
  '/groups/[id]': '/groups',
  '/groups/[id]/edit': '/groups/[id]',
  '/groups/[id]/members': '/groups/[id]',
  
  // Settings pages
  '/settings/privacy': '/settings',
  '/settings/notifications': '/settings',
  '/settings/account': '/settings',
  
  // Auth pages
  '/auth/signin': '/',
  '/auth/signup': '/auth/signin',
  '/auth/forgot-password': '/auth/signin',
  '/auth/update-password': '/settings',
  
  // Other pages
  '/onboarding': '/',
  '/privacy': '/settings',
  '/terms': '/settings',
  '/support': '/settings',
}

// Helper function to get the parent route for a given path
export function getParentRoute(currentPath: string): string {
  // Handle dynamic routes by replacing IDs with placeholders
  const normalizedPath = currentPath.replace(/\/[a-f0-9-]+(?=\/|$)/g, '[id]')
  
  // Find the parent route
  const parentRoute = navigationHierarchy[normalizedPath]
  
  if (!parentRoute) {
    // Fallback to dashboard if no parent is defined
    return '/'
  }
  
  // If the parent is a dynamic route, we need to preserve the actual ID
  if (parentRoute.includes('[id]')) {
    const idMatch = currentPath.match(/\/[a-f0-9-]+(?=\/|$)/)
    if (idMatch) {
      return parentRoute.replace('[id]', idMatch[0].substring(1))
    }
  }
  
  return parentRoute
}

// Custom hook for hierarchical navigation
export function useHierarchicalNavigation() {
  const router = useRouter()
  
  const goBack = (currentPath: string) => {
    const parentRoute = getParentRoute(currentPath)
    router.push(parentRoute)
  }
  
  return { goBack, getParentRoute }
}
