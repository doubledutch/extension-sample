import React, { Component } from 'react'
import ReactNative, {
  KeyboardAvoidingView, Platform, TouchableOpacity, Text, TextInput, View, ScrollView
} from 'react-native'

import client, { Avatar, TitleBar } from '@doubledutch/rn-client'
import FirebaseConnector from '@doubledutch/firebase-connector'
const fbc = FirebaseConnector(client, 'extension-sample')

fbc.initializeAppWithSimpleBackend()

class HomeView extends Component {
  constructor() {
    super()

    this.state = { task: '', userPrivateTasks: [], sharedTasks: [] }

    this.signin = fbc.signin()
      .then(user => this.user = user)
      .catch(err => console.error(err))
  }

  componentWillMount() {
    this.signin.then(() => {
      const userPrivateRef = fbc.database.private.userRef('tasks')
      userPrivateRef.on('child_added', data => {
        this.setState({ userPrivateTasks: [...this.state.userPrivateTasks, {...data.val(), key: data.key }] })
      })
      userPrivateRef.on('child_removed', data => {
        this.setState({ userPrivateTasks: this.state.userPrivateTasks.filter(x => x.key !== data.key) })
      })

      const sharedRef = fbc.database.public.allRef('tasks')
      sharedRef.on('child_added', data => {
        this.setState({ sharedTasks: [...this.state.sharedTasks, {...data.val(), key: data.key }] })
      })
      sharedRef.on('child_removed', data => {
        this.setState({ sharedTasks: this.state.sharedTasks.filter(x => x.key !== data.key) })
      })
    })
  }

  render() {
    const { userPrivateTasks, sharedTasks } = this.state
    const tasks = userPrivateTasks.map(t => ({...t, type:'private'})).concat(
      sharedTasks.map(t => ({...t, type:'shared'}))
    )

    return (
      <KeyboardAvoidingView style={s.container} behavior={Platform.select({ios: "padding", android: null})}>
        <TitleBar title="To do ✅" client={client} signin={this.signin} />
        <ScrollView style={s.scroll}>
          { tasks.map(task => (
            <View key={task.key} style={s.task}>
              <TouchableOpacity onPress={() => this.markComplete(task)}><Text style={s.checkmark}>✅  </Text></TouchableOpacity>
              { renderCreator(task) }
              <Text style={s.taskText}>{task.text}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={s.compose}>
          <TextInput style={s.composeText} placeholder="Add task..."
            value={this.state.task}
            onChangeText={task => this.setState({task})} />
          <View style={s.sendButtons}>
            <TouchableOpacity style={s.sendButton} onPress={this.createPrivateTask}><Text style={s.sendButtonText}>+ private 🕵️️</Text></TouchableOpacity>
            <TouchableOpacity style={s.sendButton} onPress={this.createSharedTask}><Text style={s.sendButtonText}>+ shared 📢</Text></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    )
  }

  createPrivateTask = () => this.createTask(fbc.database.private.userRef)
  createSharedTask = () => this.createTask(fbc.database.public.allRef)
  
  createTask(ref) {
    if (this.user && this.state.task) {
      ref('tasks').push({
        text: this.state.task,
        creator: client.currentUser
      })
      .then(() => this.setState({task: ''}))
      .catch (x => console.error(x))
    }    
  }

  markComplete(task) {
    getRef(task).remove()

    function getRef(task) {
      switch(task.type) {
        case 'private': return fbc.database.private.userRef('tasks').child(task.key)
        case 'shared': return fbc.database.public.allRef('tasks').child(task.key)
      }
    }
  }
}

function renderCreator(task) {
  if (task.type === 'private') return <Text style={s.creatorEmoji}>🕵️️</Text>
  return <Avatar user={task.creator} size={22} style={s.creatorAvatar} />
}

const fontSize = 18
const s = ReactNative.StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d9e1f9',
  },
  scroll: {
    flex: 1,
    padding: 15
  },
  task: {
    flex: 1,
    flexDirection: 'row',
    marginBottom: 10
  },
  checkmark: {
    textAlign: 'center',
    fontSize
  },
  creatorAvatar: {
    marginRight: 4
  },
  creatorEmoji: {
    marginRight: 4,
    fontSize
  },
  taskText: {
    fontSize,
    flex: 1
  },
  compose: {
    height: 70,
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 10
  },
  sendButtons: {
    justifyContent: 'center',
  },
  sendButton: {
    justifyContent: 'center',
    margin: 5
  },
  sendButtonText: {
    fontSize: 20,
    color: 'gray'
  },
  composeText: {
    flex: 1
  }
})

export default HomeView
