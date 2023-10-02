const messagesModel = require("../models/messages.model");
const socket = io("http://localhost:4000")

const messageContainer = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')

const name = document.getElementById('first_name') //getting the user's name

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
  const messageElement = document.createElement('div')
  messageElement.innerText = message
  messageContainer.append(messageElement)
}

module.exports = MessageController;