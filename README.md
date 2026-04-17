# Govee Light Management for Stream Deck

<div align="center">

![Stream Deck Plugin](https://img.shields.io/badge/Stream%20Deck-Plugin-blue?style=flat-square&logo=elgato)
![Version](https://img.shields.io/badge/version-2.1.3-green?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue?style=flat-square&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=flat-square&logo=node.js)

**Enterprise-grade Stream Deck plugin for managing Govee smart lights with advanced group functionality**

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Contributing](#contributing) • [License](#license)

</div>

## Features

### 🎛️ **Individual Light Control**

- Toggle lights on/off with visual state indicators
- Adjust brightness, color, and color temperature
- Real-time state synchronization with your lights
- Support for all Govee light models

### 👥 **Advanced Group Management**

- **Create** custom light groups with intuitive interface
- **Edit** group names and modify included lights
- **Delete** groups with confirmation prompts
- **Visual indicators** for group states (●/○/◐)

### 🎛️ **Stream Deck+ Encoder Support**

- **Brightness Dial** - Adjust light brightness (1-100%) with tactile dial control
- **Color Temperature Dial** - Control warm/cool white (2000K-9000K) with gradient feedback
- **Color Hue Dial** - Full-spectrum color control (0-360°) with rainbow gradient
- **Saturation Dial** - Control color intensity from pure white to full saturation (0-100%)
- **Segment Color Dial** - Per-segment color control on RGB IC light strips
- **Visual Feedback** - Real-time bar indicators with custom gradients
- **Configurable Steps** - Customize sensitivity for each dial action
- **Power Toggle** - Press any dial to toggle light power on/off
- **Group Support** - All dials work with light groups for room-wide control

### 🎨 **Professional UI**

- Custom Stream Deck dark theme with SDPI framework
- Responsive form controls and accessibility compliance
- Intuitive Property Inspector interface
- Real-time status updates and error handling

### 🏗️ **Enterprise Architecture**

- Domain-driven design (DDD) with clean architecture
- Comprehensive TypeScript implementation
- Robust error handling and state management
- WebSocket communication for real-time updates

## Dials Demo

Check out the **[Stream Deck+ Dials Guide](docs/DIALS_GUIDE.md)** for comprehensive documentation with real-world scenarios, configuration tips, and troubleshooting.

**Quick overview:**

- **Brightness Dial** - Dim/brighten your lights with tactile control
- **Color Temperature Dial** - Switch from warm to cool white
- **Color Hue Dial** - Paint your room with any color (360°)
- **Saturation Dial** - Control color intensity (white ↔ vibrant)
- **Segment Color Dial** - Per-segment RGB strip control

📸 **Screenshots and demo videos** available in the [Gallery](docs/gallery/)

## Installation

### Prerequisites

- [Stream Deck Software](https://www.elgato.com/en/gaming/downloads) (v6.0 or later)
- [Node.js](https://nodejs.org/) (v18.0 or later)
- Govee API Key (obtainable from [Govee Developer API](https://developer.govee.com/))

### Option 1: Install from Stream Deck Store

_(Coming soon)_

### Option 2: Manual Installation

1. **Download the latest release**

   ```bash
   # Clone the repository
   git clone https://github.com/felixgeelhaar/govee-light-management.git
   cd govee-light-management
   ```

2. **Install dependencies and build**

   ```bash
   npm install
   npm run build
   ```

3. **Install the plugin**

   ```bash
   # Install using Stream Deck CLI
   streamdeck install com.felixgeelhaar.govee-light-management.sdPlugin
   ```

4. **Restart Stream Deck**
   - Quit Stream Deck completely
   - Restart the application
   - The plugin will appear in your actions list

## Usage

### Getting Started

1. **Obtain Govee API Key**
   - Visit [Govee Developer API](https://developer.govee.com/)
   - Sign up and create an API key
   - Save your API key securely

2. **Add Actions to Stream Deck**
   - Drag "Govee Light Control" or "Govee Group Control" to a button
   - Configure with your API key in the Property Inspector

### Individual Light Control

1. **Setup**
   - Add "Govee Light Control" action to a Stream Deck button
   - Enter your Govee API key
   - Select a light from the dropdown

2. **Configuration Options**
   - **Control Mode**: Toggle, On, Off, Brightness, Color, Color Temperature
   - **Brightness**: Set specific brightness level (1-100%)
   - **Color**: Choose RGB color with hex picker
   - **Color Temperature**: Set warmth (2000K-9000K)

3. **Usage**
   - Press button to execute the configured action
   - Button shows real-time state: ● (on), ○ (off), ◐ (mixed)

### Group Management

1. **Create Groups**
   - Add "Govee Group Control" action
   - Enter API key and click "Create New Group"
   - Name your group and select lights to include
   - Click "Create Group" to save

2. **Edit Groups**
   - Select existing group from dropdown
   - Click "✏️ Edit" button
   - Modify name or change included lights
   - Click "Update Group" to save changes

3. **Delete Groups**
   - Select group from dropdown
   - Click "🗑️ Delete" button
   - Confirm deletion in popup dialog

4. **Control Groups**
   - Configure control mode (same options as individual lights)
   - Press button to control all lights in group simultaneously
   - Visual feedback shows combined group state

### Stream Deck+ Encoder Controls

**Note:** Requires Stream Deck+ device with dial/encoder support.

#### Brightness Dial

1. **Setup**
   - Add "Brightness Dial" action to an encoder slot
   - Enter API key and discover lights
   - Select a light with brightness capability
   - Configure step size (1-25% per tick, default: 5%)

2. **Usage**
   - **Rotate clockwise**: Increase brightness
   - **Rotate counter-clockwise**: Decrease brightness
   - **Press dial**: Toggle light power on/off
   - **Display**: Shows light name and current brightness percentage
   - **Feedback bar**: Visual brightness indicator (dimmed when off)

#### Color Temperature Dial

1. **Setup**
   - Add "Color Temperature Dial" action to an encoder slot
   - Enter API key and discover lights
   - Select a light with color temperature capability
   - Configure step size (50-500K per tick, default: 100K)

2. **Usage**
   - **Rotate clockwise**: Cooler white (towards 9000K)
   - **Rotate counter-clockwise**: Warmer white (towards 2000K)
   - **Press dial**: Toggle light power on/off
   - **Display**: Shows light name and current temperature in Kelvin
   - **Feedback bar**: Gradient indicator (warm to cool)

#### Color Hue Dial

1. **Setup**
   - Add "Color Hue Dial" action to an encoder slot
   - Enter API key and discover lights
   - Select a light with color control capability
   - Configure step size (1-90° per tick, default: 15°)
   - Configure saturation (0-100%, default: 100%)

2. **Usage**
   - **Rotate clockwise**: Cycle through color spectrum
   - **Rotate counter-clockwise**: Cycle backward through spectrum
   - **Press dial**: Toggle light power on/off
   - **Display**: Shows light name and current hue in degrees
   - **Feedback bar**: Rainbow gradient indicator
   - **Color wheel**: 0° Red → 120° Green → 240° Blue → 360° Red

### Advanced Features

#### Real-time State Monitoring

- Buttons automatically update to reflect current light states
- Group indicators show combined state of all lights
- Error states are clearly communicated

#### API Key Management

- API keys are securely stored in Stream Deck settings
- Validation occurs before attempting API calls
- Clear error messages for authentication issues

#### Testing Groups

- Use "Test Group" button to verify group functionality
- Performs quick blink test on all group lights
- Confirms connectivity and group integrity

## Development

### Prerequisites for Development

```bash
# Install dependencies
npm install

# Install Stream Deck CLI globally
npm install -g @elgato/cli
```

### Development Workflow

```bash
# Start development with auto-rebuild
npm run watch

# Run tests
npm test
npm run test:coverage

# Run linting
npm run lint
npm run lint:fix

# Type checking
npm run type-check

# Format code
npm run format
```

#### Stream Deck CLI Workflow

The project ships with helper scripts that wrap the official Stream Deck CLI so you can exercise the plugin directly inside Stream Deck while developing:

```bash
# Enable developer mode in the Stream Deck desktop app (run once)
npm run streamdeck:dev

# Link the local plugin bundle into Stream Deck's plugins directory
npm run streamdeck:link

# Rebuild and restart the plugin after code changes
npm run build:backend
npm run streamdeck:restart

# Stop the plugin when you no longer need it running
npm run streamdeck:stop

# Validate the plugin bundle before packaging/distribution
npm run streamdeck:validate

# Create a .streamDeckPlugin package for installation
npm run streamdeck:pack
```

> ℹ️ The `link` command creates a symlink from `com.felixgeelhaar.govee-light-management.sdPlugin` into Stream Deck's plugin directory. After linking, you only need to call `streamdeck:restart` each time you rebuild the backend or property inspector.

### Project Structure

```
govee-light-management/
├── src/                          # Source code
│   ├── actions/                  # Stream Deck action handlers
│   ├── domain/                   # Domain layer (DDD)
│   │   ├── entities/            # Business entities
│   │   ├── repositories/        # Repository interfaces
│   │   └── services/            # Domain services
│   └── infrastructure/          # Infrastructure layer
│       └── repositories/        # Repository implementations
├── com.felixgeelhaar.govee-light-management.sdPlugin/
│   ├── ui/                      # Property Inspector UI
│   └── bin/                     # Built plugin files
├── test/                        # Test files
└── docs/                        # Documentation
```

### Architecture

This plugin follows **Domain-Driven Design (DDD)** principles:

- **Domain Layer**: Core business logic and entities
- **Infrastructure Layer**: External API integrations and data persistence
- **Application Layer**: Stream Deck action handlers and UI coordination

### Testing

```bash
# Unit tests
npm test

# Coverage report
npm run test:coverage

# E2E tests (requires Stream Deck)
npm run test:e2e

# Start test server for manual testing
npm run test:server
```

## API Reference

### Govee API Integration

This plugin uses the [@felixgeelhaar/govee-api-client](https://www.npmjs.com/package/@felixgeelhaar/govee-api-client) library for Govee API interactions.

**Supported Operations:**

- Get device list
- Get device state
- Control device power
- Set brightness (1-100%)
- Set color (RGB)
- Set color temperature (2000K-9000K)

**Rate Limiting:**

- Respects Govee API rate limits (100 requests/minute)
- Implements exponential backoff for failed requests
- Queues multiple operations to prevent API throttling

## Troubleshooting

### Common Issues

**Plugin not appearing in Stream Deck**

- Ensure Stream Deck software is v6.0 or later
- Restart Stream Deck completely after installation
- Check plugin is properly built: `npm run build`

**API Key not working**

- Verify API key from [Govee Developer Console](https://developer.govee.com/)
- Ensure API key has proper permissions
- Check network connectivity and firewall settings

**Lights not responding**

- Verify lights are online in Govee Home app
- Check if lights support API control (newer models)
- Ensure lights are on same network as computer

**Group operations failing**

- Verify all lights in group are online
- Check for API rate limiting (too many requests)
- Ensure group hasn't been deleted by another device

### Debug Logging

Enable debug logging in Stream Deck Console:

1. Open Stream Deck software
2. Help → Open Stream Deck Console
3. Filter by "govee-light-management"
4. Check for error messages and API responses

### Getting Help

- 📖 Check [Wiki](https://github.com/felixgeelhaar/govee-light-management/wiki) for detailed guides
- 🐛 Report bugs via [GitHub Issues](https://github.com/felixgeelhaar/govee-light-management/issues)
- 💬 Join discussions in [GitHub Discussions](https://github.com/felixgeelhaar/govee-light-management/discussions)
- 📧 Contact: [felix@geelhaar.dev](mailto:felix@geelhaar.dev)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## Roadmap

### v2.1.3 (Current)

- [x] Individual light control with 8 modes (On/Off, Brightness, Color, Color Temp, Segment, Scene, Music, Toggle)
- [x] Advanced group management with full dial support
- [x] Stream Deck+ encoder support (5 dials: Brightness, Color Temp, Color Hue, Saturation, Segment Color)
- [x] Real-time state synchronization with live state sync on appear
- [x] Enterprise-grade architecture (Domain-Driven Design)
- [x] Scene management with device-specific scene discovery
- [x] Music-reactive lighting with adjustable sensitivity
- [x] Feature toggle control (Nightlight, Gradient, DreamView, Scene Stage)
- [x] Full group support across all actions and dials
- [x] Visual feedback system with green/red flash indicators

### v2.2.0 (Planned)

- [ ] Enhanced color picker with preset colors
- [ ] Scheduled actions and timers
- [ ] Multi-action sequences
- [ ] Custom effect creation for RGB strips
- [ ] Device-specific capability detection improvements

### v3.0.0 (Long-term Vision)

- [ ] LAN connectivity for lower latency
- [ ] WebSocket support for real-time state updates
- [ ] Cloud sync for group configurations across devices
- [ ] Integration with other smart home platforms
- [ ] Mobile companion app for remote control

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Elgato Stream Deck SDK](https://docs.elgato.com/sdk) for the excellent development platform
- [Govee](https://govee.com/) for their smart lighting products and API
- [TypeScript](https://www.typescriptlang.org/) for type safety and developer experience
- The open source community for inspiration and best practices

## Support

If you find this plugin useful, consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs and requesting features
- 🤝 Contributing code or documentation
- 💬 Sharing with the Stream Deck community

---

<div align="center">

**Made with ❤️ for the Stream Deck community**

[Website](https://geelhaar.dev) • [GitHub](https://github.com/felixgeelhaar) • [Twitter](https://twitter.com/felixgeelhaar)

</div>
