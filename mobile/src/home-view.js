import React, { Component } from 'react'
import ReactNative, {
  KeyboardAvoidingView, TouchableOpacity, Text, TextInput, View, ScrollView
} from 'react-native'

import client, { TitleBar } from '@doubledutch/rn-client'
import FirebaseConnector from '@doubledutch/firebase-connector'
const fbc = FirebaseConnector(client, 'feature-sample')

fbc.initializeAppWithSimpleBackend()

class HomeView extends Component {
  constructor() {
    super()

    this.state = { task: '', userPrivateTasks: [], userPublicTasks: [], sharedTasks: [] }

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

      fbc.database.public.usersRef().on('value', data => {
        const val = data.val()
        const taskMaps = Object.keys(val || {}).map(uid => ({uid, tasks: val[uid].tasks})).filter(x=>x.tasks)
        const userPublicTasks = [].concat.apply([], taskMaps.map(m => Object.keys(m.tasks).map(key => ({...m.tasks[key], key, uid: m.uid}))))
        this.setState({userPublicTasks})
      })
    })
  }

  render() {
    const { userPrivateTasks, userPublicTasks, sharedTasks } = this.state
    const tasks = userPrivateTasks.map(t => ({...t, type:'private'})).concat(
      userPublicTasks.map(t => ({...t, type:'public'})),
      sharedTasks.map(t => ({...t, type:'shared'}))
    )

    return (
      <KeyboardAvoidingView style={s.container} behavior="padding">
        <TitleBar title="feature-sample" client={client} signin={this.signin} />
        <ScrollView style={s.scroll}>
          { tasks.map(task => (
            <View key={task.key} style={s.task}>
              <TouchableOpacity onPress={() => this.markComplete(task)}><Text>✅</Text></TouchableOpacity>
              <Text style={s.taskLabel}>{taskLabel(task)}</Text><Text> {task.text}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={s.compose}>
          <TextInput style={s.composeText} placeholder="Add task..."
            value={this.state.task}
            onChangeText={task => this.setState({task})} />
          <TouchableOpacity style={s.sendButton} onPress={this.createPrivateTask}><Text style={s.sendButtonText}>🕵️️</Text></TouchableOpacity>
          <TouchableOpacity style={s.sendButton} onPress={this.createPublicTask}><Text style={s.sendButtonText}>📢</Text></TouchableOpacity>
          <TouchableOpacity style={s.sendButton} onPress={this.createSharedTask}><Text style={s.sendButtonText}>⚽</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    )
  }

  createPrivateTask = () => this.createTask(fbc.database.private.userRef)
  createPublicTask = () => this.createTask(fbc.database.public.userRef)
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
        case 'public': return fbc.database.public.usersRef(task.uid).child('tasks').child(task.key)
        case 'shared': return fbc.database.public.allRef('tasks').child(task.key)
      }
    }
  }
}

function taskLabel(task) {
  return task.type === 'public' ? `${task.creator.FirstName} ${task.creator.LastName}` : task.type
}

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
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginBottom: 10,
  },
  taskLabel: {
    color: 'blue'
  },
  compose: {
    height: 70,
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 10
  },
  sendButton: {
    justifyContent: 'center',
    marginLeft: 10
  },
  sendButtonText: {
    fontSize: 24
  },
  composeText: {
    flex: 1
  }
})

export default HomeView
