import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Widget from './Widget'
import './styles.css'
import './widget-styles.css'

const isWidget = window.location.hash === '#widget' || window.location.search.includes('widget=1')

// Widget 模式：标记 html 元素，让 CSS 能覆盖主 app 的背景色
if (isWidget) {
  document.documentElement.setAttribute('data-widget', '')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isWidget ? <Widget /> : <App />}
  </React.StrictMode>
)
