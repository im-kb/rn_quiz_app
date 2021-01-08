import React, {useState, useEffect, Component} from 'react';
import {
    FlatList,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    Button,
    View,
    Image,
    ScrollView,
    RefreshControl,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createDrawerNavigator} from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from 'react-native-splash-screen';
import {DrawerContentScrollView, DrawerItemList, DrawerItem} from '@react-navigation/drawer';
import SQLite from 'react-native-sqlite-storage';
import NetInfo from '@react-native-community/netinfo';


const _ = require('lodash');
console.disableYellowBox = true;
let db;
let check;
var yourScore = 0;
const STORAGE_KEY = '@save_rule_status';
const checkInternet = NetInfo.addEventListener(state => {
    check = state.isConnected;
});

const wait = (timeout) => {
    return new Promise(resolve => {
        setTimeout(resolve, timeout);
    });
};

function WelcomeScreen({navigation}) {
    const [accepted, setAccepted] = useState(false);
    useEffect(() => {
        getData();
    }, []);

    if (accepted == true) {
        eval(navigation.navigate('HomeScreen'));
    }

    const onAccept = async () => {
        try {
            console.log(accepted);
            setAccepted(true);
            await AsyncStorage.setItem(STORAGE_KEY, 'true');
        } catch (err) {
            console.log(err);
        }
    };


    const getData = async () => {
        try {
            const value = await AsyncStorage.getItem(STORAGE_KEY);
            if (value !== null) {
                if (value == 'true') {
                    setAccepted(true);
                } else {
                    setAccepted(false);
                }
            }
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <View style={styles.welcomeScreen}>
            <View style={styles.welcomeScreenText}>
                <Text>REGULAMINREGULAMINREGULAMINREGULAMINREGULAMINREGULAMINREGULAMINREGULAMINREGULAMIN</Text>

                <View style={styles.welcomeScreenButtons}>
                    <TouchableOpacity style={[styles.welcomeScreenButton]}
                                      onPress={() => {
                                          navigation.navigate('HomeScreen'),
                                              onAccept();
                                      }}><Text>Akceptuję</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.welcomeScreenButton]}><Text>Nie</Text></TouchableOpacity>
                </View>
            </View>
        </View>
    );
}


class HomeScreen extends Component {
    constructor(props) {
        super(props);
        this.state = {
            tests: [],
            tags: [],
            details: [],
        };
    }

    async loadAllTestsDetails(db) {
        let tests = this.state.tests;
        db.transaction(tx => {
            let testsDetails = [];
            tests.forEach((itm, i) => {
                let tasks = [];
                tx.executeSql('SELECT * FROM questions WHERE id LIKE "' + itm.id + '" ;', [], (tx, results) => {
                    for (let j = 0; j < results.rows.length; j++) {
                        let answers = [];
                        tx.executeSql('SELECT * FROM answers WHERE question LIKE "' + results.rows.item(j).question + '" ;', [], (tx, resultsA) => {
                            for (let k = 0; k < resultsA.rows.length; k++) {
                                if (resultsA.rows.item(k).isCorrect == 'true') {
                                    answers.push({
                                        'content': resultsA.rows.item(k).content,
                                        'isCorrect': true,
                                    });
                                } else {
                                    answers.push({
                                        'content': resultsA.rows.item(k).content,
                                        'isCorrect': false,
                                    });
                                }
                            }
                            tasks.push({
                                'question': results.rows.item(j).question,
                                'answers': answers,
                                'duration': parseInt(results.rows.item(j).duration),
                            });
                            if (j == (resultsA.rows.length - 1)) {
                                testsDetails.push({
                                    'tags': itm.tags,
                                    'tasks': tasks,
                                    'name': itm.name,
                                    'description': itm.description,
                                    'level': itm.level,
                                    'id': itm.id,
                                });
                                if (i == (tests.length - 1)) {
                                    this.setState({details: testsDetails});
                                }
                            }
                        });
                    }
                });
            });
        });
    }

    async getAllTags(db) {
        const query = 'SELECT * FROM tags;';
        let table = [];
        db.transaction(tx => {
            tx.executeSql(query, [], (tx, results) => {
                let len = results.rows.length;
                if (len > 0) {
                    for (let i = 0; i < results.rows.length; i++) {
                        table.push(results.rows.item(i));
                    }
                    this.setState({tags: table});
                    this.getAllTests(db);
                }
            });
        });
    }

    async getAllTests(db) {
        let tags = this.state.tags;
        const query = 'SELECT * FROM tests;';
        let table = [];
        db.transaction(tx => {
            tx.executeSql(query, [], (tx, results) => {
                let len = results.rows.length;
                if (len > 0) {
                    for (let i = 0; i < results.rows.length; i++) {
                        table.push(results.rows.item(i));
                        let idtag = table[i].id;
                        table[i].tags = [];
                        tags.forEach((item, z) => {
                            if (item.id_tag === idtag) {
                                table[i].tags.push(item.tag);
                            }
                        });
                    }

                    this.setState({tests: _.shuffle(table)});
                    this.loadAllTestsDetails(db);
                }
            });
        });
    }

    async getData(id) {
        return await fetch('http://tgryl.pl/quiz/test/' + id)
            .then((response) => response.json())
            .then((json) => {
                return json;
            })
            .catch((error) => console.error(error));
    }

    async navigateTest(navigation, prop_test) {
        const details = this.state.details;
        details.forEach((item, i) => {
            if (item.id == prop_test.id) {
                navigation.navigate(prop_test.name, {
                    name: prop_test.name,
                    test: _.shuffle(item.tasks),
                    questionIndex: 0,
                    numberOfTasks: prop_test.numberOfTasks,
                });
            }
        });
    }


    async checkLocalDB() {
        const dateFromStorage = await AsyncStorage.getItem('CurrentDate');
        if (
            dateFromStorage ===
            new Date().getDate().toString() +
            '-' +
            new Date().getMonth().toString() +
            '-' +
            new Date().getFullYear().toString()
        ) {
            alert('Tests up-to-date');
        } else {
            await AsyncStorage.setItem(
                'CurrentDate',
                new Date().getDate().toString() +
                '-' +
                new Date().getMonth().toString() +
                '-' +
                new Date().getFullYear().toString(),
            );
            this.getAllTags(db);
            this.getAllTests(db);
            alert('Tests downloaded to local database');
        }
    }

    componentDidMount() {
        this.checkLocalDB();
        this.getAllTags(db);
        this.getAllTests(db);
    }

    render() {
        db.transaction(tx => {
            tx.executeSql('SELECT * FROM questions', [], (tx, results) => {
            });
            tx.executeSql('SELECT * FROM answers', [], (tx, results) => {
            });
        });
        const tests = _.shuffle(this.state.tests); //mieszaj pytania na homescreen
        const navigation = this.props.navigation;

        return (
            <View style={styles.container}>
                <View style={styles.toolbar}>
                    <View style={[styles.hamburgerButton]}>
                        <TouchableOpacity onPress={() => {
                            navigation.openDrawer();
                        }}>
                            <Image source={require('./hamburgerIcon.png')} style={styles.hamburgerIcon}/>
                        </TouchableOpacity>
                    </View>
                    <View></View>
                    <Text style={[styles.toolbarText]}>Home
                        Page</Text>
                    <View></View>
                </View>
                <View style={{flex: 10, backgroundColor: 'white'}}>
                    <SafeAreaView>
                        <FlatList
                            keyExtractor={(item) => item.id}
                            data={tests}
                            renderItem={({item}) => (
                                <TouchableOpacity style={styles.item} onPress={() => {
                                    this.navigateTest(navigation, item);
                                }}>
                                    <Text style={{fontSize: 24, fontFamily: 'Roboto-Light'}}>{item.name}</Text>
                                    <View style={styles.tagsView}>
                                        {
                                            item.tags.map(n => (
                                                <Text key={n.toString()} style={styles.tag}>{n.toString()}</Text>
                                            ))
                                        }
                                    </View>
                                    <View>
                                        <Text style={{fontFamily: 'OpenSans-Regular'}}>{item.description}</Text>
                                    </View>
                                </TouchableOpacity>
                            )
                            }
                        />
                    </SafeAreaView>
                </View>
                <View style={styles.resultToolbar}>
                    <Text style={{fontSize: 24, fontFamily: 'Roboto-Light'}}> Get to know your ranking result</Text>
                    <TouchableOpacity style={[styles.goToResult]} onPress={() => navigation.navigate('Results')}>
                        <Text style={{textAlign: 'center', fontFamily: 'OpenSans-Regular'}}>Check!</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }
}

function TestScreen({navigation, route}) {
    const title = route.params.name;
    const test = route.params.test;
    const qIndex = route.params.questionIndex;
    const testLength = route.params.numberOfTasks;

    return (
        <View style={{flex: 1}}>
            <View style={styles.toolbar}>
                <View style={[styles.hamburgerButton]}>
                    <TouchableOpacity onPress={() => {
                        navigation.openDrawer();
                    }}>
                        <Image source={require('./hamburgerIcon.png')} style={styles.hamburgerIcon}/>
                    </TouchableOpacity>
                </View>
                <Text style={[styles.toolbarText]}>{title}</Text>
            </View>

            <View style={{flex: 12, backgroundColor: 'white'}}>
                {testLength > qIndex ? renderQuestion({navigation}, title, test, qIndex, testLength) : renderScore({navigation}, title, testLength)}
            </View>
        </View>
    );
}

function renderQuestion({navigation}, title, test, qIndex, testLength) {
    const [key, setKey] = useState(0);
    const [run, setRun] = useState(true);
    useEffect(() => {
        setRun(true);
        return () => {
            setRun(false);
        };
    }, []);
    return (
        <View style={{flex: 12, backgroundColor: 'white'}}>
            <View style={{flex: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 10}}>
                <Text
                    style={{fontSize: 16, fontFamily: 'OpenSans-Regular'}}>Question {qIndex + 1} of {testLength}</Text>
                <View style={{flexDirection: 'row'}}>
                    <Text style={{fontFamily: 'OpenSans-Regular'}}>Time: </Text>
                    <Text style={{fontFamily: 'OpenSans-Regular'}}>timeLeft</Text>
                    <Text style={{fontFamily: 'OpenSans-Regular'}}> s</Text>
                </View>

            </View>
            <ScrollView>
                <View style={styles.questionBox}>
                    <Image source={require('./progress.png')} style={styles.progressBar}/>
                    <Text style={styles.questionText}>{test[qIndex].question}</Text>
                </View>
            </ScrollView>
            <View style={styles.answerBox}>
                <View style={styles.answers}>
                    {
                        _.shuffle(test[qIndex].answers) //LOSOWANIE KOLEJNOSCI ODPOWIEDZI
                            .map(n => (
                                <TouchableOpacity style={[styles.answer]} onPress={() => {
                                    if (n.isCorrect) {
                                        yourScore++;
                                    }
                                    setKey(prevKey => prevKey + 1);
                                    nextQuestion({navigation}, title, test, qIndex, testLength);
                                }}><Text>{n.content}</Text></TouchableOpacity>
                            ))
                    }
                </View>
            </View>
        </View>
    );
}

function nextQuestion({navigation}, title, test, qIndex, testLength) {
    if (qIndex - 1 < testLength) {
        navigation.navigate(title, {name: title, test: test, questionIndex: qIndex + 1, numberOfTasks: testLength});
    }
}

function renderScore({navigation}, title, testLength) {
    fetch('http://tgryl.pl/quiz/result', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(
            {
                nick: 'MyNickname',
                score: yourScore,
                total: testLength,
                type: title,
            },
        ),
    });
    yourScore = 0;
    navigation.navigate('Results');
}

function ResultScreen({navigation}) {
    const [refreshing, setRefreshing] = React.useState(false);
    const [resultJson, setResultJson] = React.useState([]);
    useEffect(() => {
        NetInfo.fetch().then(state => {
            if (state.isConnected == true) {
                console.log('Downloading results');
                fetch('http://tgryl.pl/quiz/results')
                    .then((response) => response.json())
                    .then((json) => setResultJson(json.reverse()))
                    .catch((error) => console.error(error));
            } else {
                alert('No network connection, can not show results');
            }
        });


        return () => {
        };
    }, []);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        wait(2000).then(() => {
            fetch('http://tgryl.pl/quiz/results')
                .then((response) => response.json())
                .then((json) => setResultJson(json.reverse()))
                .catch((error) => console.error(error));
            setRefreshing(false);
        });
    }, []);

    return (
        <View style={{flex: 1}}>
            <View style={styles.toolbar}>
                <View style={[styles.hamburgerButton]}>
                    <TouchableOpacity onPress={() => {
                        navigation.openDrawer();
                    }}>
                        <Image source={require('./hamburgerIcon.png')} style={styles.hamburgerIcon}/>
                    </TouchableOpacity>
                </View>
                <Text style={styles.toolbarText}>Results</Text>
                <View style={{flex: 3}}></View>
            </View>
            <View style={{flex: 12, padding: 10, backgroundColor: 'white'}}>
                <SafeAreaView>
                    <ScrollView
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>
                        }
                    >
                        <View style={{
                            flex: 1,
                            flexDirection: 'row',
                            borderWidth: 1,
                            borderBottomWidth: 0,
                            borderColor: 'black',
                        }}>
                            <Text style={{
                                flex: 1,
                                borderBottomWidth: 1,
                            }}>Nick</Text>
                            <Text style={{
                                flex: 1,
                                borderBottomWidth: 1,
                            }}>Point</Text>
                            <Text style={{
                                flex: 1,
                                borderBottomWidth: 1,
                            }}>Type</Text>
                            <Text style={{
                                flex: 1,
                                borderBottomWidth: 1,
                            }}>Date</Text>
                        </View>
                        <View>
                            <FlatList
                                data={resultJson}
                                renderItem={({item}) => (
                                    <View style={{
                                        flex: 1,
                                        flexDirection: 'row',
                                        borderLeftWidth: 1,
                                        borderRightWidth: 1,
                                    }}>
                                        <Text style={{
                                            flex: 1,
                                            borderBottomWidth: 1,
                                        }}>{item.nick}</Text>
                                        <View style={{
                                            flex: 1,
                                            flexDirection: 'row',
                                            borderBottomWidth: 1,
                                        }}>
                                            <Text>{item.score.valueOf()}</Text>
                                            <Text>/</Text>
                                            <Text>{item.total.valueOf()}</Text>
                                        </View>
                                        <Text style={{
                                            flex: 1,
                                            borderBottomWidth: 1,
                                        }}>{item.type}</Text>
                                        <Text style={{
                                            flex: 1,
                                            borderBottomWidth: 1,
                                        }}>{item.createdOn}</Text>
                                    </View>
                                )
                                }
                            />
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </View>
        </View>
    );
}


class CustomDrawerContent extends Component {
    constructor(props) {
        super(props);
        this.state = {
            navigation: props.navigation,
            tags: [],
            tests: [],
            details: [],
        };
    }

    async loadAllTestsDetails(db) {
        let tests = this.state.tests;
        db.transaction(tx => {
            let testsDetails = [];
            tests.forEach((itm, i) => {
                let tasks = [];
                tx.executeSql('SELECT * FROM questions WHERE id LIKE "' + itm.id + '" ;', [], (tx, results) => {
                    for (let j = 0; j < results.rows.length; j++) {
                        let answers = [];
                        tx.executeSql('SELECT * FROM answers WHERE question LIKE "' + results.rows.item(j).question + '" ;', [], (tx, resultsA) => {
                            for (let k = 0; k < resultsA.rows.length; k++) {
                                if (resultsA.rows.item(k).isCorrect == 'true') {
                                    answers.push({
                                        'content': resultsA.rows.item(k).content,
                                        'isCorrect': true,
                                    });
                                } else {
                                    answers.push({
                                        'content': resultsA.rows.item(k).content,
                                        'isCorrect': false,
                                    });
                                }
                            }
                            tasks.push({
                                'question': results.rows.item(j).question,
                                'answers': answers,
                                'duration': parseInt(results.rows.item(j).duration),
                            });
                            if (j == (resultsA.rows.length - 1)) {
                                testsDetails.push({
                                    'tags': itm.tags,
                                    'tasks': tasks,
                                    'name': itm.name,
                                    'description': itm.description,
                                    'level': itm.level,
                                    'id': itm.id,
                                });
                                if (i == (tests.length - 1)) {
                                    this.setState({details: testsDetails});
                                }
                            }
                        });
                    }
                });
            });
        });
    }

    async getAllTags(db) {
        const query = 'SELECT * FROM tags;';
        let table = [];
        db.transaction(tx => {
            tx.executeSql(query, [], (tx, results) => {
                let len = results.rows.length;
                if (len > 0) {
                    for (let i = 0; i < results.rows.length; i++) {
                        table.push(results.rows.item(i));
                    }
                    this.setState({tags: table});
                    this.getAllTests(db);
                }
            });
        });
    }

    async getAllTests(db) {
        let tags = this.state.tags;
        const query = 'SELECT * FROM tests;';
        let table = [];
        db.transaction(tx => {
            tx.executeSql(query, [], (tx, results) => {
                let len = results.rows.length;
                if (len > 0) {
                    for (let i = 0; i < results.rows.length; i++) {
                        table.push(results.rows.item(i));
                        let idtag = table[i].id;
                        table[i].tags = [];
                        tags.forEach((item, z) => {
                            if (item.id_tag === idtag) {
                                table[i].tags.push(item.tag);
                            }
                        });
                    }

                    this.setState({tests: _.shuffle(table)});
                    this.loadAllTestsDetails(db);
                }
            });
        });
    }

    async getData(id) {
        try {
            return await fetch('http://tgryl.pl/quiz/test/' + id)
                .then((response) => response.json())
                .then((json) => {
                    return json;
                })
                .catch((error) => console.error(error));
        } catch (err) {
            console.log(err);
        }
    }

    async navigateTest(navigation, prop_test) {
        const details = this.state.details;
        details.forEach((item, i) => {
            if (item.id == prop_test.id) {
                navigation.navigate(prop_test.name, {
                    name: prop_test.name,
                    test: _.shuffle(item.tasks),
                    questionIndex: 0,
                    numberOfTasks: prop_test.numberOfTasks,
                });
            }
        });
    }

    componentDidMount() {
        this.getAllTags(db);
    }

    render() {
        db.transaction(tx => {
            tx.executeSql('SELECT * FROM questions', [], (tx, results) => {
            });
            tx.executeSql('SELECT * FROM answers', [], (tx, results) => {
            });
        });
        const navigation = this.state.navigation;
        const tests = this.state.tests;

        return (
            <DrawerContentScrollView style={{backgroundColor: 'lightgrey'}}>
                <Text style={{fontSize: 34, alignSelf: 'center', margin: 10, fontFamily: 'Roboto-Light'}}>Quiz
                    App</Text>
                <Image source={require('./logo.png')} style={{height: 150, width: 140, alignSelf: 'center'}}/>
                <View style={{paddingBottom: 10, borderColor: 'black', borderBottomWidth: 1}}>

                    <TouchableOpacity style={styles.drawerButtons} onPress={() => {
                        navigation.navigate('HomeScreen');
                    }}><Text>Home</Text></TouchableOpacity>

                    <TouchableOpacity style={styles.drawerButtons} onPress={() => {
                        navigation.navigate('Results');
                    }}><Text>Results</Text></TouchableOpacity>

                    <TouchableOpacity style={styles.drawerButtons} onPress={() => {
                        var randTestItem = tests[Math.floor(Math.random() * tests.length)]; ///losowanie rand testu
                        console.log(randTestItem);
                        this.navigateTest((navigation), randTestItem);
                    }}>
                        <Text>Random test</Text></TouchableOpacity>


                    <TouchableOpacity style={styles.drawerButtons} onPress={() => {
                        NetInfo.fetch().then(state => {
                            if (state.isConnected == true) {
                                fetch('http://tgryl.pl/quiz/tests')
                                    .then((response) => response.json())
                                    .then((json) => this.setState({tests: _.shuffle(json)}))
                                    .catch((error) => console.error(error));
                            } else {
                                alert('No network connection, cant update');
                            }
                        });
                    }}><Text>Update tests</Text></TouchableOpacity>


                </View>

                {
                    _.shuffle(tests).map(n => ( //losowanie w drawerze
                        <TouchableOpacity style={styles.drawerButtons} onPress={() => {
                            this.navigateTest((navigation), n);
                        }}>
                            <Text style={{textAlign: 'center'}}>{n.name.toString()}</Text></TouchableOpacity>
                    ))
                }
            </DrawerContentScrollView>
        );
    }
}

const Drawer = createDrawerNavigator();

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            tests: [],
            test: 0,
        };
        db = SQLite.openDatabase(
            {
                name: 'database.db',
                createFromLocation: 1,
            },
        );
    }

    createTables(db) {
        const query1 = 'DROP TABLE IF EXISTS tests;';
        const query2 = 'DROP TABLE IF EXISTS tags;';
        const query3 = 'CREATE TABLE "tests" ( "id" TEXT, "name" TEXT, "description" TEXT, "tags" INTEGER, "level" TEXT, "numberOfTasks" INTEGER, PRIMARY KEY("id"));';
        const query4 = 'CREATE TABLE "tags" ( "tag" TEXT, "id_tag" INTEGER, PRIMARY KEY("tag") )';
        const query5 = 'DROP TABLE IF EXISTS questions;';
        const query6 = 'DROP TABLE IF EXISTS answers;';
        const query7 = 'CREATE TABLE "questions" ( "question" TEXT, "id" TEXT, "duration" INTEGER, PRIMARY KEY("question"));';
        const query8 = 'CREATE TABLE "answers" ( "content" TEXT, "question" TEXT, "isCorrect" TEXT, PRIMARY KEY("content","question"));';
        db.transaction(tx => {
            tx.executeSql(query1, [], (tx, results) => {
            });
            tx.executeSql(query2, [], (tx, results) => {
            });
            tx.executeSql(query4, [], (tx, results) => {
            });
            tx.executeSql(query3, [], (tx, results) => {
            });
            tx.executeSql(query5, [], (tx, results) => {
            });
            tx.executeSql(query6, [], (tx, results) => {
            });
            tx.executeSql(query7, [], (tx, results) => {
            });
            tx.executeSql(query8, [], (tx, results) => {
            });
        });
    }

    saveTestDetails(db) {
        let test = this.state.test;
        db.transaction(tx => {
            test.tasks.forEach((item, i) => {
                tx.executeSql('INSERT INTO questions VALUES( "' + item.question + '" , "' + test.id + '" , ' + item.duration + ' )', [], (tx, results) => {
                });
                item.answers.forEach((item2, i2) => {
                    tx.executeSql('INSERT INTO answers VALUES( "' + item2.content + '" , "' + item.question + '" , "' + item2.isCorrect.toString() + '" )', [], (tx, results) => {
                    });
                });
            });

        });
    }

    saveAllTestDetails(db) {
        const tests = this.state.tests;
        tests.forEach((items, i) => {
            fetch('http://tgryl.pl/quiz/test/' + items.id)
                .then((response) => response.json())
                .then((json) => {
                    this.setState({test: json});
                })
                .then(() => {
                    this.saveTestDetails(db);
                })
                .catch((error) => console.error(error));
        });
    }

    saveTest(db, test) {
        const query = 'INSERT INTO tests VALUES( "' + test.id + '" , "' + test.name + '" , "' + test.description + '" ,' + 1 + ', "' + test.level + '" ,' + test.numberOfTasks + ');';
        let query2;
        db.transaction(tx => {
            tx.executeSql(query, [], (tx, results) => {
            });
            test.tags.forEach((item, i) => {
                query2 = 'INSERT INTO tags VALUES( "' + test.tags[i] + '" , "' + test.id + '" );';
                tx.executeSql(query2, [], (tx, results) => {
                });
            });
        });
    }

    saveAllTests(db) {
        const tests = this.state.tests;
        tests.forEach((item, i) => {
            this.saveTest(db, item);
        });
    }

    async getAllTags(db) {
        const query = 'SELECT * FROM tags;';
        let table = [];
        db.transaction(tx => {
            tx.executeSql(query, [], (tx, results) => {
                let len = results.rows.length;
                if (len > 0) {
                    for (let i = 0; i < results.rows.length; i++) {
                        table.push(results.rows.item(i));
                    }
                    this.setState({tags: table});
                    this.getAllTests(db);
                }
            });
        });
    }

    async getAllTests(db) {
        let tags = this.state.tags;
        const query = 'SELECT * FROM tests;';
        let table = [];
        db.transaction(tx => {
            tx.executeSql(query, [], (tx, results) => {
                let len = results.rows.length;
                if (len > 0) {
                    for (let i = 0; i < results.rows.length; i++) {
                        table.push(results.rows.item(i));
                        let idtag = table[i].id;
                        table[i].tags = [];
                        tags.forEach((item, z) => {
                            if (item.id_tag === idtag) {
                                table[i].tags.push(item.tag);
                            }
                        });
                    }

                    this.setState({tests: _.shuffle(table)});
                    this.loadAllTestsDetails(db);
                }
            });
        });
    }

    componentDidMount() {
        this.getAllTags(db);
        this.getAllTests(db);
        SplashScreen.hide();
        NetInfo.fetch().then(state => {
            if (state.isConnected == true) {
                fetch('http://tgryl.pl/quiz/tests')
                    .then((response) => response.json())
                    .then((json) => {
                        this.setState({tests: json});
                    })
                    .then(() => {
                        this.createTables(db);
                    })
                    .then(() => {
                        this.saveAllTests(db);
                    })
                    .then(() => {
                        this.saveAllTestDetails(db);
                    })
                    .catch((error) => console.error(error));
            } else {
                this.getAllTags(db);
                alert('No network connection, using local database');
            }
        });

    }

    render() {
        const tests = this.state.tests;
        return (
            <NavigationContainer>
                <Drawer.Navigator initialRouteName="WelcomeScreen"
                                  drawerContent={(props) => <CustomDrawerContent {...props} />}>
                    <Drawer.Screen name='WelcomeScreen' component={WelcomeScreen}/>
                    <Drawer.Screen name="HomeScreen" component={HomeScreen}/>
                    <Drawer.Screen name="Results" component={ResultScreen}/>
                    <Drawer.Screen name="tests" component={TestScreen}/>

                    {
                        tests.map(t => (
                            <Drawer.Screen name={t.name} component={TestScreen}/>
                        ))
                    }
                </Drawer.Navigator>
            </NavigationContainer>
        );
    };
}

const styles = StyleSheet.create({
    drawerButtons: {
        flex: 1,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        borderWidth: 1,
        fontFamily: 'OpenSans-Regular',
        margin: 12,
        height: 55,
        fontSize: 18,
    },
    hamburgerButton: {
        width: 55,
        height: 50,
        alignItems: 'flex-start',
    },
    hamburgerIcon: {
        width: 28,
        height: 50,
    },
    toolbar: {
        flex: 1,
        flexDirection: 'row',
        borderBottomWidth: 1,
        alignItems: 'center',
        paddingLeft: 15,
    },
    toolbarText: {
        display: 'flex',
        color: 'black',
        fontSize: 24,
        fontFamily: 'Roboto-Light',
        flex: 1,
    },
    questionBox: {
        flex: 3,
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'Roboto',
    },
    questionText: {
        textAlign: 'center',
        padding: 15,
        fontSize: 24,
        fontFamily: 'Roboto-Light',
        flex: 1,

    },
    questionText2: {
        fontSize: 18,
        fontFamily: 'OpenSans-Regular',
    },
    answerBox: {
        borderColor: 'black',
        borderWidth: 1,
        margin: 10,
        height: 400,
    },
    answers: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-evenly',
        flexDirection: 'column',
        margin: 16,
    },
    answer: {
        borderWidth: 1,
        height: 50,
        width: 300,
        fontFamily: 'OpenSans-Regular',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 3,
    },
    progressBar: {
        width: 400,
        height: 30,
    },
    container: {
        flex: 1,
    },
    resultToolbar: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: 'black',
        borderWidth: 1,
    },
    item: {
        padding: 8,
        marginVertical: 6,
        marginHorizontal: 16,
        borderWidth: 1,
        flex: 1,
    },
    tagsView: {
        flexDirection: 'row',
        marginVertical: 10,
        fontFamily: 'OpenSans-Regular',
    },
    tag: {
        color: 'blue',
        marginRight: 5,
        fontFamily: 'OpenSans-Regular',
    },
    goToResult: {
        margin: 10,
        height: 40,
        width: 120,
        backgroundColor: 'lightgrey',
        justifyContent: 'center',
    },
    welcomeScreenButton: {
        margin: 10,
        height: 80,
        width: 120,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeScreen: {
        flex: 1,
        backgroundColor: 'lightgrey',
        flexDirection: 'row',
        margin: 10,
    },
    welcomeScreenButtons: {
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        flex: 1,
        flexDirection: 'row',
    },
    welcomeScreenText: {
        margin: 10,
    },
});
export default App;
