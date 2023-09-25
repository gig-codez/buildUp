const messagesModel = require("../models/messages.model");
const socket = io("http://localhost:4000")

const messageCotainer = document.getElementById('send-container')
const mesasgeInput = document.getElementById('message-input')

const name = document.getElementById('user_name')

appendMessage('You joined')
socket.emit('new-user', name)


socket.on('chat-message', data =>{
  appendMessage('${data.name}: ${data.message}')
})
socket.on('user-connected', name =>{
  appendMessage('${name} connected')
})
socket.on('user-disconnected', name =>{
  appendMessage('${name} disconnected')
})


messageForm.addEventListener('submit', e =>{
  e.preventDefault()
  const message = messageInput.value
  appendMessage('You: ${message}')
  socket.emit('send-chat-message', message)
  messageInput.Value = ''
})

function appendMessage(message) {
  const messagElement = document.createElement('div')
  messageElement.innerText = message
  messageContainer.append(messageElement)
}

module.exports = MessageController;