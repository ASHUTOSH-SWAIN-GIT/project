import { render, screen, fireEvent } from '@testing-library/react'
import Home from '../page'
import { supabase } from '@/lib/supabase'

jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
    }
  },
}))

describe('Home Page', () => {
  it('renders login button', () => {
    render(<Home />)
    const loginButton = screen.getByRole('button', { name: /continue with google/i })
    expect(loginButton).toBeInTheDocument()
  })

  it('calls Supabase auth on login button click', async () => {
    render(<Home />)
    const loginButton = screen.getByRole('button', { name: /continue with google/i })
    
    fireEvent.click(loginButton)
    
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: expect.any(Object)
    })
  })
}) 