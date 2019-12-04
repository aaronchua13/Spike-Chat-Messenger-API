
const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const http = require('http')
const bodyParser = require('body-parser')
const path = require('path');
// server instance
const server = http.createServer(app)
const socketIO = require('socket.io');
const fetch = require('node-fetch')
const cors = require('cors')
const fs =require('fs', {
  withFileTypes: true
})
const ss = require('socket.io-stream')

// creates socket using the instance of the server
const io = socketIO(server, { wsEngine: 'ws' })

app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

  ss(socket).on('all_images', () => {
    const fileTypes = ['.jpg', '.jpeg', '.png']
    const directoryPath = path.join(__dirname, 'files');

  fs.readdir(directoryPath, (err, files) => {
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    }
  
    files.filter(e => 
      fileTypes.includes(
        e.slice(
            e.lastIndexOf('.')
          )
      )
    ).map(e => {
        const outboundStream = ss.createStream()
        ss(socket).emit('all_images', outboundStream, {
          file_name: e
        })
        fs.createReadStream(path.join('./files', e)).pipe(outboundStream)
      })
    });
  })
  
  ss(socket).on('upload_image', (stream, file) => {
      var filename = path.basename(file.file_name);
      const filepath = path.join('./files', filename)
      stream.pipe(fs.createWriteStream(filepath));
      let size = 0

      stream.on('data', (chunk) => {
        size += chunk.length;
        const percent = Math.floor(size / file.size * 100)
        console.log(`${percent === 100 ? 'Upload Complete' : `Uploading... ${percent}%`}`);
      });

      const outboundStream = ss.createStream()
      stream.on('end', () => {
          ss(socket).emit('receive_client', outboundStream, {
            size: file.size,
            file_name: file.file_name
          })
          fs.createReadStream(filepath).pipe(outboundStream)
      });
  });
  
  socket.on('disconnect', () => {
    console.log('User Disconnected')
  })
})


// console.log that your server is up and running
server.listen(port, () => console.log(`Listening on port ${port}`));


