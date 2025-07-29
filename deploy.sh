#!/bin/bash

# JARVIS Deployment Script
# This script helps you deploy JARVIS to various platforms

echo "🚀 JARVIS Deployment Script"
echo "=========================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit: JARVIS AI Assistant"
fi

# Function to deploy to GitHub Pages
deploy_github() {
    echo "🐙 Deploying to GitHub Pages..."
    
    # Check if remote exists
    if ! git remote get-url origin > /dev/null 2>&1; then
        echo "❌ No GitHub remote found!"
        echo "Please create a GitHub repository and add it as origin:"
        echo "git remote add origin https://github.com/YOUR_USERNAME/jarvis-ai.git"
        return 1
    fi
    
    git add .
    git commit -m "Update: $(date)"
    git push origin main
    
    echo "✅ Pushed to GitHub!"
    echo "📝 Enable GitHub Pages in your repository settings:"
    echo "   Settings → Pages → Deploy from main branch"
}

# Function to deploy to Netlify
deploy_netlify() {
    echo "🌐 Deploying to Netlify..."
    
    # Check if netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        echo "📦 Installing Netlify CLI..."
        npm install -g netlify-cli
    fi
    
    # Create netlify.toml if it doesn't exist
    if [ ! -f "netlify.toml" ]; then
        cat > netlify.toml << EOF
[build]
  publish = "."
  command = ""

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
EOF
        echo "📄 Created netlify.toml"
    fi
    
    netlify deploy --prod
    echo "✅ Deployed to Netlify!"
}

# Function to deploy to Vercel
deploy_vercel() {
    echo "⚡ Deploying to Vercel..."
    
    # Check if vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        echo "📦 Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    vercel --prod
    echo "✅ Deployed to Vercel!"
}

# Function to start local server
start_local() {
    echo "🏠 Starting local server..."
    echo "📱 Share this URL with others on your network:"
    echo "   http://$(hostname -I | awk '{print $1}'):8000"
    echo ""
    echo "Press Ctrl+C to stop the server"
    python -m http.server 8000 --bind 0.0.0.0
}

# Function to create QR code
create_qr() {
    echo "📱 Creating QR code..."
    
    # Check if qrencode is installed
    if command -v qrencode &> /dev/null; then
        echo "Enter your JARVIS URL:"
        read url
        qrencode -t ANSI "$url"
    else
        echo "💡 Install qrencode for QR code generation:"
        echo "   Ubuntu/Debian: sudo apt install qrencode"
        echo "   macOS: brew install qrencode"
        echo "   Or use online tools: https://qr-code-generator.com"
    fi
}

# Function to optimize for sharing
optimize_for_sharing() {
    echo "🔧 Optimizing for sharing..."
    
    # Create optimized version
    mkdir -p optimized
    
    # Copy files
    cp *.html *.css *.js *.json *.png *.gif optimized/
    
    # Create a simple index for sharing
    cat > optimized/share.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>JARVIS - AI Assistant</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 2rem; }
        .share-btn { background: #00d4ff; color: white; padding: 1rem 2rem; border: none; border-radius: 8px; margin: 1rem; cursor: pointer; }
        .share-btn:hover { background: #0099cc; }
    </style>
</head>
<body>
    <h1>🤖 JARVIS - AI Assistant</h1>
    <p>Advanced AI-powered virtual assistant with voice recognition</p>
    
    <button class="share-btn" onclick="window.open('index.html', '_blank')">🚀 Try JARVIS</button>
    
    <h2>Features:</h2>
    <ul style="text-align: left; max-width: 500px; margin: 0 auto;">
        <li>🎤 Voice recognition</li>
        <li>🤖 AI-powered responses</li>
        <li>🌤️ Weather information</li>
        <li>📰 News updates</li>
        <li>🔍 Web searches</li>
        <li>😄 Jokes and entertainment</li>
    </ul>
    
    <script>
        // Share functionality
        if (navigator.share) {
            document.querySelector('.share-btn').addEventListener('click', () => {
                navigator.share({
                    title: 'JARVIS - AI Assistant',
                    text: 'Check out this amazing AI assistant!',
                    url: window.location.href
                });
            });
        }
    </script>
</body>
</html>
EOF
    
    echo "✅ Created optimized version in 'optimized' folder"
    echo "📁 Share the entire 'optimized' folder"
}

# Main menu
while true; do
    echo ""
    echo "Choose deployment option:"
    echo "1) 🐙 Deploy to GitHub Pages"
    echo "2) 🌐 Deploy to Netlify"
    echo "3) ⚡ Deploy to Vercel"
    echo "4) 🏠 Start local server"
    echo "5) 📱 Create QR code"
    echo "6) 🔧 Optimize for sharing"
    echo "7) 📋 Show sharing tips"
    echo "8) ❌ Exit"
    echo ""
    read -p "Enter your choice (1-8): " choice
    
    case $choice in
        1) deploy_github ;;
        2) deploy_netlify ;;
        3) deploy_vercel ;;
        4) start_local ;;
        5) create_qr ;;
        6) optimize_for_sharing ;;
        7) show_tips ;;
        8) echo "👋 Goodbye!"; exit 0 ;;
        *) echo "❌ Invalid choice. Please try again." ;;
    esac
done

# Function to show sharing tips
show_tips() {
    echo ""
    echo "📋 Sharing Tips:"
    echo "================"
    echo ""
    echo "🌐 Online Platforms:"
    echo "   • GitHub Pages: Free, easy setup"
    echo "   • Netlify: Professional, automatic deployment"
    echo "   • Vercel: Fast, great performance"
    echo "   • Firebase: Google's hosting solution"
    echo ""
    echo "📱 Mobile Sharing:"
    echo "   • Generate QR codes for easy access"
    echo "   • Use 'Add to Home Screen' feature"
    echo "   • Share via messaging apps"
    echo ""
    echo "🎯 Social Media:"
    echo "   • Create demo videos"
    echo "   • Share screenshots"
    echo "   • Write blog posts about your project"
    echo ""
    echo "📧 Email Sharing:"
    echo "   • Include feature list"
    echo "   • Add personal touch"
    echo "   • Request feedback"
    echo ""
} 