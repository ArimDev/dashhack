import 'package:flutter/material.dart';
import '../screens/teams.dart';

class EditTeamDialog extends StatefulWidget {
  final Team team;

  const EditTeamDialog({super.key, required this.team});

  @override
  State<EditTeamDialog> createState() => _EditTeamDialogState();
}

class _EditTeamDialogState extends State<EditTeamDialog> {
  late TextEditingController _nameController;
  late TextEditingController _repositoryController;
  late Color _selectedColor;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.team.name);
    _repositoryController = TextEditingController(text: widget.team.repository);
    _selectedColor = widget.team.color;
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text("Edit Team"),
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
          child: const Text("Save"),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _repositoryController.dispose();
    super.dispose();
  }
}
