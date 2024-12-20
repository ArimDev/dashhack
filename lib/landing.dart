import 'package:flutter/material.dart';

class LandingPage extends StatefulWidget {
  const LandingPage({super.key});

  @override
  State<LandingPage> createState() => _LandingPageState();
}

class _LandingPageState extends State<LandingPage> {
  final TextEditingController _projectNameController = TextEditingController();
  final TextEditingController _projectPasswordController =
      TextEditingController();

  @override
  void dispose() {
    // Properly dispose of controllers to prevent memory leaks
    _projectNameController.dispose();
    _projectPasswordController.dispose();
    super.dispose();
  }

  void _goToAppPage() {
    if (_projectNameController.text.isNotEmpty) {
      print(
          'Navigating to /app with projectName: ${_projectNameController.text}');
      Navigator.pushNamed(
        context,
        '/app', // Navštívíme stránku 'AppPage'
        arguments: {
          'projectName': _projectNameController.text,
          'projectPassword': _projectPasswordController.text,
        },
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vyplňte název projektu.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.primary,
        title: const Text(
          "Hackathon Dashboard",
          style: TextStyle(
            color: Colors.white,
          ),
        ),
        centerTitle: true,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                "Hackathon Dashboard",
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              const Text(
                "The Hackathon Dashboard helps manage hackathons and track team progress.",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _projectNameController,
                      decoration: const InputDecoration(
                        labelText: "Project Name",
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _projectPasswordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: "Project Password (optional)",
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _goToAppPage,
                child: const Text("Continue to the App"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
