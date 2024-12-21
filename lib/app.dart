import 'package:flutter/material.dart';
import "./screens/home.dart";
import "./screens/teams.dart";

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter App',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const AppPage(),
    );
  }
}

class AppPage extends StatefulWidget {
  const AppPage({super.key});

  @override
  _AppPageState createState() => _AppPageState();
}

class _AppPageState extends State<AppPage> {
  int _selectedIndex = 0;

  String getDevice() {
    return MediaQuery.of(context).size.width <= 800 ? "small" : "large";
  }

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)?.settings.arguments as Map?;
    if (args == null) {
      print('No arguments were passed to AppPage');
    } else {
      print('Received arguments: $args');
    }
    final projectName = args?['projectName'] ?? 'Unknown';
    final projectPassword = args?['projectPassword'] ?? 'No password';

    final List<Widget> screens = [
      HomeScreen(projectName: projectName, projectPassword: projectPassword),
      const TeamsScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: Theme.of(context).colorScheme.primary,
        title: Text(
          "$projectName Hackathon",
          style: const TextStyle(
            color: Colors.white,
          ),
        ),
        centerTitle: true,
      ),
      bottomNavigationBar: getDevice() == "small"
          ? BottomNavigationBar(
              currentIndex: _selectedIndex,
              onTap: (index) {
                if (index == 2) {
                  Navigator.pop(
                    context,
                    '/',
                  );
                } else {
                  setState(() {
                    _selectedIndex = index;
                  });
                }
              },
              items: const [
                BottomNavigationBarItem(
                  icon: Icon(Icons.home),
                  label: 'Home',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.groups),
                  label: 'Teams',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.logout),
                  label: 'Logout',
                ),
              ],
            )
          : null,
      body: Row(
        children: [
          SafeArea(
            child: Stack(
              children: [
                if (getDevice() == "large")
                  NavigationRail(
                    labelType: NavigationRailLabelType.all,
                    destinations: const [
                      NavigationRailDestination(
                        icon: Icon(Icons.home),
                        label: Text('Home'),
                      ),
                      NavigationRailDestination(
                        icon: Icon(Icons.groups),
                        label: Text('Teams'),
                      ),
                    ],
                    selectedIndex: _selectedIndex,
                    onDestinationSelected: (index) {
                      setState(() {
                        _selectedIndex = index;
                      });
                    },
                  ),
                if (getDevice() == "large")
                  Positioned(
                      bottom: 16.0,
                      left: 0,
                      right: 0,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.logout),
                            onPressed: () {
                              Navigator.pop(
                                context,
                                '/',
                              );
                            },
                            iconSize: 24.0,
                            color: Colors.black,
                          ),
                          const Text(
                            'Logout',
                            style: TextStyle(
                              color: Colors.black,
                            ),
                          ),
                        ],
                      )),
              ],
            ),
          ),
          Expanded(
            child: screens[_selectedIndex],
          ),
        ],
      ),
      backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
    );
  }
}
