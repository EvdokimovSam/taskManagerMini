const express = require('express');
const app = express();
const port = 3000;
const { Liquid } = require('liquidjs');
const engine = new Liquid();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/Laba4', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const taskSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
}, { collection: 'plans' });

const Task = mongoose.model('Task', taskSchema);

const userSchema = new mongoose.Schema({
  login: {
    type: String,
    required: true,
  },
  pass: {
    type: String,
    required: true,
  },
});

const User = mongoose.model('User', userSchema);

app.engine('liquid', engine.express());
app.set('views', './views');
app.set('view engine', 'liquid');

const cookieParser = require('cookie-parser');
const session = require('express-session');
app.use(bodyParser.urlencoded({ extended: true }));
app.set('trust proxy', 1);

app.use(
  session({
    secret: 'asda21e2e',
    resave: false,
    saveUninitialized: true,
  })
);

app.use(cookieParser());

function auth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

app.get('/login', (req, res) => {
  if (!req.session.user) res.render('login');
  else res.redirect('/');
});

app.post('/login', async (req, res) => {
  const user = await User.findOne({ login: req.body.user });
  if (user != null) {
    if (user.pass == req.body.password) {
      req.session.user = user.login;
      req.session.userID = user._id;
      res.redirect('/');
      return;
    }
  }
  res.redirect('/login');
});

app.get('/logout', (req, res) => {
  req.session.user = '';
  res.redirect('/login');
});

app.get('/', auth, async (req, res) => {
  const user = req.session.userID;
  const tasks = await Task.find({ userID: user });
  if (tasks != null) {
    res.render('home', {
      tasks: tasks
        .filter((x) => x.userID.toString() === user.toString())
        .filter((x) => !x.completed)
        .map((x) => x.toObject()),
      completedTasks: tasks
        .filter((x) => x.userID.toString() === user.toString())
        .filter((x) => x.completed)
        .map((x) => x.toObject()),
    });
  }
});

app.post('/addTask', async (req, res) => {
  const newTask = req.body.newtask;
  if (newTask != '') {
    const task = new Task({
      name: newTask,
      userID: req.session.userID,
    });
    await task.save();
  }
  res.redirect('/');
});

app.post('/completedTask', async (req, res) => {
  try {
    const completedTasks = req.body.check; // Массив ID отмеченных задач
    const user = req.session.userID;

    // Обновляем каждую отмеченную задачу
    await Promise.all(
      completedTasks.map(async (taskId) => {
        await Task.updateOne(
          { _id: taskId, userID: user },
          { completed: true }
        );
      })
    );

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.redirect('/'); // или другое действие при возникновении ошибки
  }
});


app.use(auth, (req, res, next) => {
  res.redirect('/');
});



async function startServer() {
  try {
    // Создание пользователя
    const user = new User({
      login: 'user',
      pass: '123',
    });

    await user.save();
    console.log('Пользователь успешно создан');

    app.listen(port, () => console.log('started'));
  } catch (err) {
    console.error(err);
  }
}

startServer();
