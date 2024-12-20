import 'package:flutter/material.dart';
import '../screens/teams.dart';

class AddTeamDialog extends StatefulWidget {
  const AddTeamDialog({super.key});

  @override
  State<AddTeamDialog> createState() => _AddTeamDialogState();
}

class _AddTeamDialogState extends State<AddTeamDialog> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _repositoryController = TextEditingController();
  Color _selectedColor = Colors.blue;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text("Add New Team"),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(labelText: "Team Name"),
          ),
          TextField(
            controller: _repositoryController,
            decoration: const InputDecoration(labelText: "Repository URL"),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Choose Team Color:"),
              DropdownButton<Color>(
                value: _selectedColor,
                onChanged: (Color? newValue) {
                  if (newValue != null) {
                    setState(() {
                      _selectedColor = newValue;
                    });
                  }
                },
                items: [
                  Colors.red,
                  Colors.blue,
                  Colors.green,
                  Colors.orange,
                  Colors.purple,
                ].map((color) {
                  return DropdownMenuItem<Color>(
                    value: color,
                    child: Container(
                      width: 24,
                      height: 24,
                      color: color,
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () {
            Navigator.of(context).pop(null);
          },
          child: const Text("Cancel"),
        ),
        ElevatedButton(
          onPressed: () {
            if (_nameController.text.isNotEmpty) {
              Navigator.of(context).pop(Team(
                name: _nameController.text,
                color: _selectedColor,
                repository: _repositoryController.text,
              ));
            }
          },
          child: const Text("Add"),
        ),
      ],
    );
  }
}
