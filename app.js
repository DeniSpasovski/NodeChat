/**
  * NodeChat node.js
  * author: Deni Spasovski
  */
var net = require('net');
var globalPubSub = require ('./pubSub.js');
var chatRooms = require ('./chatRoom.js');
var chatUsers = require ('./chatUser.js');
var messageHandler = require ('./messageHandler.js');
var chatTypes = {'console': 'console', 'websocket': 'websocket'};
chatRooms.createChatRoom('main');
chatRooms.createChatRoom('second');
messageHandler.initObject({chatUsers:chatUsers, chatRooms:chatRooms, chatTypes: chatTypes, globalPubSub: globalPubSub});

/**
  * server listener function for new connections
  * after that we listen to 'on message' and 'user log off' events
  *
  * @param {Object} socket
  */
function newSocket(socket) {
	socket.write('Welcome to D Node Chat server!\r\n');
  socket.write('Login Name?\r\n');
  socket.chatType = chatTypes.console;
	socket.on('data', function(data) {
    if(socket._dirtyChatData)/*first message received from telnet client was nonsense*/
		  messageHandler.receiveData(socket, data);
    else
      socket._dirtyChatData = true;
	})
	socket.on('end', function() {
		messageHandler.userLogOff(socket);
	})
}

/**
  * helper function that expands object in console 
  *
  * @param {Object} obj
  */
function ObjectDebugger(obj){
  if(obj == null)
    console.log('-null object-');
  console.log('-object-');
  for(var prop in obj){
    console.log('prop: ' + prop + "  value:" + obj[prop]);  
  } 
  console.log('-objectend-'); 
}

/* attach the listener to the new Socket event */
var server = net.createServer(newSocket);
 
/* app is hosted on port 8888 */
server.listen(8888);