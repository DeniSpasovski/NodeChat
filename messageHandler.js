(function(){
  var chatUsers = {};
  var chatRooms = {};
  var chatTypes = {};
  var globalPubSub = {};

  var cleanInput = function _cleanInput(data) {
	  return data.toString().replace(/(\r\n|\n|\r)/gm,'');
  }

  var receiveData = function _receiveData(socket, data) {
	  var _cleanData = cleanInput(data);
    console.log('cleandata:' + _cleanData);
    if(_cleanData.length == 0)
      return;

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
  
  var sendMessageToSocket = function _sendMessageToSocket(socket, message){
    switch(socket.chatType){
      case chatTypes.console:
        if(socket && !socket.destroyed && socket.writable)
          try{
            socket.write(message + '\r\n');
          }catch (err) {
            console.log('socket write error!!');
          }
        break;
      case chatTypes.websocket:
        //todo
        break;
    }  
  }
 
  var authenticateUser = function _authenticateUser(socket, data) {
    var _user = chatUsers.createUser(data);
    if(_user == null){
      sendMessageToSocket(socket, 'Sorry, name taken.')
      sendMessageToSocket(socket, 'Login Name?')
    } else {
      socket.isChatUserAuthenticated = true;
      socket.chatUser = _user;
      _user.socket = socket;
      sendMessageToSocket(socket, 'Welcome ' + _user.name + '!')
    }
  }

  
  var userLogOff = function _userLogOff(socket){
    removeUserFromAllGroups(socket.chatUser);
    chatUsers.userList[socket.chatUser.name] = null;
  }

  var chatClientCommands = {
    'help': function (socket) {
      sendMessageToSocket(socket, 'Available commands are:')
      for(var command in chatClientCommands){
        sendMessageToSocket(socket, ' /' + command);
      }
      sendMessageToSocket(socket, 'end of list.');
     },  
    'rooms': function(socket, args){
      sendMessageToSocket(socket, 'Available chat rooms are:')
      for(var chatRoom in chatRooms.chatRoomList){
        sendMessageToSocket(socket, ' #' + chatRoom + '(' + chatRooms.chatRoomList[chatRoom].users.length + ')');
      }
      sendMessageToSocket(socket, 'end of list.');
     }, 
     'join': function(socket, args){
        var _chatRoomName = args[0];
        if(chatRooms.chatRoomList[_chatRoomName]){
          if(socket.chatUser.hasJoinedRoom()){
            sendMessageToSocket(socket, 'You are already joined in room:'+ _chatRoomName)
            return;  
          }
          if(socket.chatType == chatTypes.console)
          {
             //if the user joined though terminal then he can only join one room at a time
             removeUserFromAllGroups(socket.chatUser);
          }
          globalPubSub.publish('userAddedToGroup', {userId: socket.chatUser.name, groupId: _chatRoomName})
          sendMessageToSocket(socket, 'entering room: ' + _chatRoomName);
          chatClientCommands.list(socket, _chatRoomName);
        }else{
          sendMessageToSocket(socket, 'Chatroom "'+ _chatRoomName +'" does not exist');
        }
     },
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
        sendMessageToSocket(socket, 'Chatroom "'+ _chatRoomName +'" does not exist'); 
      }
     }  
  }

  var removeUserFromAllGroups = function _removeUserFromAllGroups(user){
    for(var i=0;i<user.chatRooms.length; i++){
      globalPubSub.publish('userRemovedFromGroup', {userId: user.name, groupId: user.chatRooms[i]});
    }
  }

  var userAddedToGroup = function _userAddedToGroup(data){
    if(chatRooms.chatRoomList[data.groupId]){
      broadcastMessage(chatRooms.chatRoomList[data.groupId].users, ' *new user joined chat: ' + data.userId);
      chatRooms.chatRoomList[data.groupId].addUser(data.userId);
    }
    if(chatUsers.userList[data.userId]){
      chatUsers.userList[data.userId].joinRoom(data.groupId);
    }
  }

  var userRemovedFromGroup = function _userRemovedFromGroup(data){
    if(chatRooms.chatRoomList[data.groupId]){
      broadcastMessage(chatRooms.chatRoomList[data.groupId].users, ' *user has left chat: ' + data.userId)
      chatRooms.chatRoomList[data.groupId].removeUser(data.userId);
    }
    if(chatUsers.userList[data.userId]){
      chatUsers.userList[data.userId].leaveRoom(data.groupId);
    }
  }

  var executeCommand = function _executeCommand(socket, message){
    var _commandArgs = message.split(' ');
    if(typeof chatClientCommands[_commandArgs[0]] == 'function'){
      chatClientCommands[_commandArgs[0]](socket, _commandArgs.slice(1));
    }else{
      sendMessageToSocket(socket, '*Command "'+ _commandArgs[0] +'" does not exist!');
    }
  }

  var broadcastMessage = function _sendMessage(receiversList, message){
    for(var i=0; i<receiversList.length;i++){
      if(chatUsers.userList[receiversList[i]] && chatUsers.userList[receiversList[i]].socket)
        sendMessageToSocket(chatUsers.userList[receiversList[i]].socket, message);
    }
  }

  var initObject = function initObject(params){
    chatRooms = params.chatRooms; 
    chatUsers = params.chatUsers; 
    chatTypes = params.chatTypes; 
    globalPubSub = params.globalPubSub;
    subsribeListeneres();
  }

  var subsribeListeneres = function subsribeListeneres(params){
    globalPubSub.subscribe('userRemovedFromGroup', userRemovedFromGroup);
    globalPubSub.subscribe('userAddedToGroup', userAddedToGroup);
  }

  module.exports.initObject = initObject;
  module.exports.receiveData = receiveData;
  module.exports.userLogOff = userLogOff;
})();