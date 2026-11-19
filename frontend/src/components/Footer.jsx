import React from 'react'
import { Sparkles } from "lucide-react"

const Footer = () => {
  return (
    <footer className="border-t border-orange-400/20 py-12 glass-dark">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:grid md:grid-cols-4 gap-8 items-start justify-between">
          <div className="flex flex-col items-center md:items-start space-y-2 col-span-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-rose-500 rounded-lg flex items-center justify-center glow-orange">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">showitup</span>
            </div>
            <p className="text-orange-200 text-sm text-center md:text-left">Your ultimate platform for seamless event experiences.</p>
          </div>

          <div className="flex flex-col items-center md:items-start col-span-1">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <nav className="flex flex-col space-y-2">
              <a href="#features" className="text-orange-200 hover:text-white transition-colors">Features</a>
              <a href="#testimonials" className="text-orange-200 hover:text-white transition-colors">Testimonials</a>
              <a href="#pricing" className="text-orange-200 hover:text-white transition-colors">Pricing</a>
              <a href="#contact" className="text-orange-200 hover:text-white transition-colors">Contact</a>
            </nav>
          </div>

          <div className="flex flex-col items-center md:items-start col-span-1">
            <h3 className="text-lg font-semibold text-white mb-4">Legal</h3>
            <nav className="flex flex-col space-y-2">
              <a href="#privacy" className="text-orange-200 hover:text-white transition-colors">Privacy Policy</a>
              <a href="#terms" className="text-orange-200 hover:text-white transition-colors">Terms of Service</a>
              <a href="#cookies" className="text-orange-200 hover:text-white transition-colors">Cookie Policy</a>
            </nav>
          </div>

          <div className="flex flex-col items-center md:items-end col-span-1 w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Follow Us</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-orange-200 hover:text-white transition-colors">Facebook</a>
              <a href="#" className="text-orange-200 hover:text-white transition-colors">Twitter</a>
              <a href="#" className="text-orange-200 hover:text-white transition-colors">LinkedIn</a>
              <a href="#" className="text-orange-200 hover:text-white transition-colors">Instagram</a>
            </div>
          </div>
        </div>
        <div className="mt-8 text-center text-orange-200 text-sm border-t border-orange-400/20 pt-8">
          © {new Date().getFullYear()} showitup. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default Footer