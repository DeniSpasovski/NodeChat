/**
  * NodeChat node.js
  * main code of the chat app
  * author: Deni Spasovski
  */
(function(){
  var chatUsers = {};
  var chatRooms = {};
  var chatTypes = {};
  var stringCompareHelpers = {};
  var globalPubSub = {};

  /**
  * removes newlines from input
  *
  * @param {String} data
  * @returns {String} - text without new lines
  */
  var cleanInput = function _cleanInput(data) {
	  return data.toString().replace(/(\r\n|\n|\r)/gm,'');
  }

  /**
  * handles user input
  *
  * @param {Object} socket
  * @param {String} data
  * @api public
  */
  var receiveData = function _receiveData(socket, data) {
    var _cleanData = cleanInput(data);
    if(_cleanData.length == 0)
      return;
    
    console.log('$$ ' + (new Date()).toUTCString() + ' :'+ socket.remoteAddress + ': ' + _cleanData);
    /* first the user has to pick user name */
    if(!socket.isChatUserAuthenticated)
      return authenticateUser(socket, _cleanData);

	  if(_cleanData[0] === '/') {
		  executeCommand(socket, _cleanData.substring(1));
	  }
	  else {
      var _chatRoomName = socket.chatRoomName;
      if(_chatRoomName == null){
        if(socket.chatUser.chatRooms.length){
          _chatRoomName = socket.chatUser.chatRooms[0];
        } else {
          sendMessageToSocket(socket, 'You have not joined any group. No one will read your messages.')
          return;
        }
      }
      if(chatRooms.chatRoomList[_chatRoomName]) 
		    broadcastMessage(chatRooms.chatRoomList[_chatRoomName].users, socket.chatUser.name + ': ' +_cleanData)
	  }
  }
  
  /**
  * sends message to the passed socket
  *
  * @param {Object} socket
  * @param {String} message
  */
  var sendMessageToSocket = function _sendMessageToSocket(socket, message){
    switch(socket.chatType){
      case chatTypes.console:
        if(socket && !socket.destroyed && socket.writable) /*the socket has to be writable and not destroyed*/
          try{
            socket.write(message + '\r\n');
          }catch (err){ /*try catch all the network errors*/
            console.log('socket write error!!');
          }
        break;
      case chatTypes.websocket:
        /*to do*/
        break;
    }  
  }
  
  /**
  * checks if the typed user name is valid and authenticates user
  *
  * @param {Object} socket
  * @param {String} data
  */
  var authenticateUser = function _authenticateUser(socket, data) {
    if (!stringCompareHelpers.isAlphanumeric(data)){
      sendMessageToSocket(socket, 'Name can contain only alphanumeric characters!');
      sendMessageToSocket(socket, 'Login Name?');
      return;
    }

    var _user = chatUsers.createUser(data);
    if(_user == null){
      sendMessageToSocket(socket, 'Sorry, name taken.');
      sendMessageToSocket(socket, 'Login Name?');
    } else {
      socket.isChatUserAuthenticated = true;
      socket.chatUser = _user;
      _user.socket = socket;
      sendMessageToSocket(socket, 'Welcome ' + _user.name + '!');
    }
  }

  
  /**
  * on log off remove user from all groups
  *
  * @param {Object} socket
  * @api public
  */
  var userLogOff = function _userLogOff(socket){
    if(socket.chatUser){
      removeUserFromAllGroups(socket.chatUser.name);
      chatUsers.userList[socket.chatUser.name] = null;
    }
  }
  
  /**
  * functions for handling special chat commands
  */
  var chatClientCommands = {
     /**
     * lists available commands
     *
     * @param {Object} socket
     */
    'help': function (socket) {
      sendMessageToSocket(socket, 'Available commands are:')
      for(var command in chatClientCommands){
        sendMessageToSocket(socket, ' /' + command);
      }
      sendMessageToSocket(socket, 'end of list.');
     },
     /**
     * lists all available chat rooms
     *
     * @param {Object} socket
     */
    'rooms': function(socket){
      sendMessageToSocket(socket, 'Available chat rooms are:')
      for(var chatRoom in chatRooms.chatRoomList){
        sendMessageToSocket(socket, ' #' + chatRoom + '(' + chatRooms.chatRoomList[chatRoom].users.length + ')');
      }
      sendMessageToSocket(socket, 'end of list.');
     }, 
     /**
     * add user to chat room
     *
     * @param {Object} socket 
     * @param {Array} args - args[0] should be the group name
     */
     'join': function(socket, args){
      var _chatRoomName = args[0];
      if(chatRooms.chatRoomList[_chatRoomName]){
        if(socket.chatUser.hasJoinedRoom(_chatRoomName)){
          sendMessageToSocket(socket, 'You are already joined in room:'+ _chatRoomName)
          return;  
        }
        if(socket.chatType == chatTypes.console)
        {
            /* if the user joined though terminal then he can only join one room at a time */
            removeUserFromAllGroups(socket.chatUser.name);
        }
        globalPubSub.publish('userAddedToGroup', {userId: socket.chatUser.name, groupId: _chatRoomName})
        sendMessageToSocket(socket, 'entering room: ' + _chatRoomName);
        chatClientCommands.list(socket, _chatRoomName);
      }else{
        sendMessageToSocket(socket, 'Chat room "'+ _chatRoomName +'" does not exist');
      }
     },
     /**
     * leave chat room
     *
     * @param {Object} socket 
     * @param {Array} args - args[0] should be the group name - is null when called from console
     */
     'leave': function(socket, args){
      var _chatRoomName;
      if(socket.chatType != chatTypes.console){
        if(args && args.length)
          _chatRoomName = args;
        if (_chatRoomName instanceof Array)
          _chatRoomName = _chatRoomName[0];

        if(!socket.chatUser.hasJoinedRoom(_chatRoomName)){
          sendMessageToSocket(socket, 'User does not belong to that chat room'); 
          return;
        }
      }else{
        if(socket.chatUser.chatRooms.length){
          _chatRoomName = socket.chatUser.chatRooms[0];
        }else{
          sendMessageToSocket(socket, 'User does not belong to chat room'); 
          return;
        }
      }   
      globalPubSub.publish('userRemovedFromGroup', {userId: socket.chatUser.name, groupId: _chatRoomName});
     },
     /**
     * disconnect user
     *
     * @param {Object} socket 
     */
     'quit': function(socket){
      removeUserFromAllGroups(socket.chatUser.name);
      socket.end('see you!');
     },
     /**
     * list all users in chat room
     *
     * @param {Object} socket 
     * @param {Array} args - args[0] should be the group name - can be null
     */
     'list': function(socket, args){
      var _chatRoomName;
      if(args && args.length){
        _chatRoomName = args;
        if (_chatRoomName instanceof Array)
          _chatRoomName = _chatRoomName[0];
      }else{
        
        if(socket.chatUser.chatRooms.length){
          _chatRoomName = socket.chatUser.chatRooms[0];
        }else{
          sendMessageToSocket(socket, 'User does not belong to chat room'); 
          return;
        }
      }    
      
      if(chatRooms.chatRoomList[_chatRoomName]) {
        for(var i=0; i<chatRooms.chatRoomList[_chatRoomName].users.length; i++){
          sendMessageToSocket(socket, ' *'+ chatRooms.chatRoomList[_chatRoomName].users[i])
        }
        sendMessageToSocket(socket, 'end of list.');
      }else{
        sendMessageToSocket(socket, 'Chat room "'+ _chatRoomName +'" does not exist'); 
      }
     },
     /**
     * sends private message to user
     *
     * @param {Object} socket 
     */
     'pm': function(socket, args){
       if(!chatUsers.userList[args[0]]){
         sendMessageToSocket(socket, 'User:' + args[0] + ' does not exist!');
         return;
       }
       broadcastMessage([args[0]], '*pm from '+ socket.chatUser.name +' : ' + args.slice(1).join(' '));
     }
  }

  /**
   * trigger userRemovedFromGroup event for each of the groups users belongs to
   *
   * @param {String} userName 
   */
  var removeUserFromAllGroups = function _removeUserFromAllGroups(userName){
    var user = chatUsers.userList[userName];
    if(!user){
      return;
    }
    for(var i=0;i<user.chatRooms.length; i++){
      globalPubSub.publish('userRemovedFromGroup', {userId: user.name, groupId: user.chatRooms[i]});
    }
  }

  /**
   * event that is triggered when user is added to group
   *
   * @param {Object} data - must contain groupId and userId
   */
  var userAddedToGroup = function _userAddedToGroup(data){
    if(chatRooms.chatRoomList[data.groupId]){
      broadcastMessage(chatRooms.chatRoomList[data.groupId].users, ' *new user joined chat: ' + data.userId);
      chatRooms.chatRoomList[data.groupId].addUser(data.userId);
    }
    if(chatUsers.userList[data.userId]){
      chatUsers.userList[data.userId].joinRoom(data.groupId);
    }
  }

   /**
   * event that is triggered when user is removed to group
   *
   * @param {Object} data - must contain groupId and userId
   */
  var userRemovedFromGroup = function _userRemovedFromGroup(data){
    if(chatRooms.chatRoomList[data.groupId]){
      broadcastMessage(chatRooms.chatRoomList[data.groupId].users, ' *user has left chat: ' + data.userId)
      chatRooms.chatRoomList[data.groupId].removeUser(data.userId);
    }
    if(chatUsers.userList[data.userId]){
      chatUsers.userList[data.userId].leaveRoom(data.groupId);
    }
  }

  /**
   * called when message sent by users starts with / - checks if the command exist
   *
   * @param {Object} socket
   * @param {Object} message
   */
  var executeCommand = function _executeCommand(socket, message){
    var _commandArgs = message.split(' ');
    if(typeof chatClientCommands[_commandArgs[0]] == 'function'){
      chatClientCommands[_commandArgs[0]](socket, _commandArgs.slice(1));
    }else{
      sendMessageToSocket(socket, '*Command "'+ _commandArgs[0] +'" does not exist!');
    }
  }

   /**
   * sends message to each socket stored in user object
   *
   * @param {Array} receiversList
   */
  var broadcastMessage = function _sendMessage(receiversList, message){
    for(var i=0; i<receiversList.length;i++){
      if(chatUsers.userList[receiversList[i]] && chatUsers.userList[receiversList[i]].socket)
        sendMessageToSocket(chatUsers.userList[receiversList[i]].socket, message);
    }
  }

  /**
   * Connects chatRoom and chatUser objects to the message handler
   *
   * @param {Object} params
   * @api public
   */
  var initObject = function initObject(params){
    chatRooms = params.chatRooms; 
    chatUsers = params.chatUsers; 
    chatTypes = params.chatTypes;     
    globalPubSub = params.globalPubSub;
    stringCompareHelpers = params.stringCompareHelpers;
    subsribeListeneres();
  }

  /**
   * Attach event listeners to the 'remove users' and 'add users' events
   */
  var subsribeListeneres = function subsribeListeneres(){
    globalPubSub.subscribe('userRemovedFromGroup', userRemovedFromGroup);
    globalPubSub.subscribe('userAddedToGroup', userAddedToGroup);
  }

  module.exports.initObject = initObject;
  module.exports.receiveData = receiveData;
  module.exports.userLogOff = userLogOff;
})();