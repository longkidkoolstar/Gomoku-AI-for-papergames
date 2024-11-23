# Gomoku AI for PaperGames.io

A powerful AI userscript that plays Gomoku (Five in a Row) on papergames.io. This AI uses the minimax algorithm with alpha-beta pruning and sophisticated position evaluation to play strong moves.

## Features

- Advanced minimax algorithm with configurable depth (currently set to 3)
- Smart position evaluation with threat detection
- Efficient caching system for better performance
- Automatic move detection and response
- Prioritizes strategic positions and threat responses
- Center-oriented playing style

## Installation

1. Install a userscript manager (like Tampermonkey) for your browser
2. Click [here](https://raw.githubusercontent.com/longkidkoolstar/Gomoku-AI-for-papergames/main/Gomoku%20AI.user.js) to install the script
   - Or create a new userscript in Tampermonkey and copy-paste the code

## How It Works

The AI uses several sophisticated strategies:
- Evaluates positions based on line patterns and piece configurations
- Detects and responds to immediate threats
- Prioritizes moves based on their strategic value
- Uses caching to improve performance
- Implements alpha-beta pruning for faster search

## Configuration

You can modify the AI's behavior by adjusting these parameters:
- `depth` in findBestMove(): Controls how many moves ahead the AI looks (higher = stronger but slower)
- Update interval: Currently set to check for moves every 5 seconds

## Performance Notes

- Depth 2: Fast responses, basic tactical play
- Depth 3 (recommended): Good balance of strength and speed
- Depth 4+: Stronger play but may be slow in browser environment

## Version History

- v1.0: Initial release with stable AI implementation
  - Implemented minimax algorithm with alpha-beta pruning
  - Added position evaluation and threat detection
  - Integrated caching system for better performance

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues and pull requests to improve the AI's performance.
