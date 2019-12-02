
const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const http = require('http')
// server instance
const server = http.createServer(app)
const socketIO = require('socket.io');
const fetch = require('node-fetch')
const cors = require('cors')

// creates socket using the instance of the server
const io = socketIO(server, { wsEngine: 'ws' })

app.use(cors())

// get users
app.get('/user', async (req, res) => {
  const url = 'https://rickandmortyapi.com/api/character';
  const morty = await fetch(url)
  const result = await morty.json()
  res.status(200).send({ result: result.results })
});

io.on('connection', socket => {
  socket.on('message change', (data) => {
    io.sockets.emit('message change', {...data, socket_id: socket.id})
  })

  socket.on('typing', (data) => {
    io.sockets.emit('typing', {...data, socket_id: socket.id})
  })
  
  socket.on('join', (data) => {
    {
      const newData = {
        socket_id: socket.id,
        name: data.name,
        message: `${data.name} joined the chat`,
        image: data.image,
        joined: true
      }
      io.sockets.emit('join', {socket_id: socket.id, name: data.name, image: data.image})
      io.sockets.emit('message change', newData) 
    }
  })

  socket.on('disconnect', () => {
    console.log('User Disconnected')
  })
})


// console.log that your server is up and running
server.listen(port, () => console.log(`Listening on port ${port}`));


