import 'package:flutter/material.dart';
import '../screens/teams.dart'; // Import struktury `Team`

class TeamCard extends StatelessWidget {
  final Team team;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const TeamCard({
    super.key,
    required this.team,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: team.color, // Použití barvy týmu jako pozadí
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            team.name,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 18,
              color: Colors.white, // Pro lepší kontrast na barevném pozadí
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            team.repository,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              IconButton(
                icon: const Icon(Icons.edit, color: Colors.white),
                onPressed: onEdit,
              ),
              IconButton(
                icon: const Icon(Icons.delete, color: Colors.white),
                onPressed: onDelete,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
