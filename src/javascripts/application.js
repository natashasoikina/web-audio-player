var WebAudioPlayer = function() {
    this.context = null,
    this.file = null,
    this.buffer = null,
    this.sourceNode = null,
    this.gainNode = null,
    this.filterNodes = new Array(),
    this.filterPresets = new Array(),
    this.analyserNode = null,
    this.canvas = null,
    this.canvasContext = null,
    this.canvasWidth = 0,
    this.canvasHeight = 0,
    this.animationId = 0,
    this.isPlaying = 0,
    this.startTime = 0,
    this.startOffset = 0,
    this.volumeValue = 0,
    this.playerControl = document.getElementById("player-control"),
    this.playerVolumeControl = document.getElementById("player-volume-control"),
    this.playerVolumeToggle = document.getElementById("player-volume-toggle"),
    this.playerVisualizationControl = document.getElementById("player-visualization-control"),
    this.playerEqualizerFilters = document.getElementById("equalizer-filters"),
    this.playerFilterControls = this.playerEqualizerFilters.getElementsByClassName("js-equalizer-filter"),
    this.playerEqualizerControl = document.getElementById("equalizer-control"),
    this.playerEqualizerToggle = document.getElementById("equalizer-toggle");
};

WebAudioPlayer.prototype = {
    init: function() {
        if (Modernizr.webaudio) {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();
        } else {
            alert("Web Audio API is not supported in this browser.");
        }
        this._initFilters();
        this._initAnalyser();
        this._addEventListner();
    },

    _initFilters: function() {
        var self = this,
            filterFrequencyRanges = new Array(),
            filterDefaultPreset,
            minFilterGainValue = -20,
            maxFilterGainValue = 20;

        filterFrequencyRanges = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

        this.filterPresets = [
            {name: "normal", gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
            {name: "pop", gains: [-2, 4, 8, 8, 5, 0, -3, -3, -2, -2]},
            {name: "rock", gains: [8, 5, -6, -8, -4, 3, 9, 12, 12, 12]},
            {name: "jazz", gains: [6, 5, 3, 4, -4, -4, 0, 3, 4, 6]},
            {name: "classic", gains: [0, 0, 0, 0, 0, 0, -8, -8, -8, -10]}
        ];

        filterDefaultPreset = this.filterPresets[0];

        this.playerEqualizerFilters.setAttribute("data-min-value", minFilterGainValue + "dB");
        this.playerEqualizerFilters.setAttribute("data-max-value", maxFilterGainValue + "dB");

        for (i = 0; i < filterFrequencyRanges.length; i++) {
            var filterNode = this.context.createBiquadFilter();

            filterNode.type = "peaking";
            filterNode.frequency.value = filterFrequencyRanges[i];
            filterNode.gain.value = filterDefaultPreset.gains[i];
            this.filterNodes.push(filterNode);
        }

        [].forEach.call(this.playerFilterControls, function (element, index) {
            element.setAttribute("min", minFilterGainValue);
            element.setAttribute("max", maxFilterGainValue);
            element.setAttribute("step", -1);
            element.parentElement.setAttribute("data-value", filterFrequencyRanges[index] + "Hz");
        });

        this.filterPresets.forEach(function(item) {
            var option = document.createElement("option"),
                name = item.name;

            option.value = name;
            option.textContent = name;
            self.playerEqualizerControl.appendChild(option);
        });
    },

    _enableFilters: function(source, destination) {
        source.connect(this.filterNodes[0]);
        for (i = 0; i < (this.filterNodes.length - 1); i++) {
            this.filterNodes[i].connect(this.filterNodes[i+1]);
        }
        this.filterNodes[this.filterNodes.length - 1].connect(destination);
    },

    _disableFilters: function(source, destination) {
        source.disconnect(0);
        for (i = 0; i < this.filterNodes.length; i++) {
            this.filterNodes[i].disconnect(0);
        }
        source.connect(destination);
    },

    _initCanvas: function() {
        this.canvas = document.getElementById("canvas");
        this.canvasContext = this.canvas.getContext("2d");
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
    },

    _initAnalyser: function() {
        this.analyserNode = this.context.createAnalyser();
        this.analyserNode.fftSize = 1024;
        this.analyserNode.smoothingTimeConstant = .85;
        this._initCanvas();
    },

    _visualizeFrequencyData: function() {
        var self = this,
            frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);

        this.canvasContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        function drawSpectrum() {
            self.animationId = requestAnimationFrame(drawSpectrum);

            self.analyserNode.getByteFrequencyData(frequencyData);

            self.canvasContext.fillStyle = "#272822";
            self.canvasContext.fillRect(0, 0, self.canvasWidth, self.canvasHeight);

            var arrayLength = self.analyserNode.frequencyBinCount,
                barWidth = (self.canvasWidth / arrayLength),
                barHeight,
                x = 0;

            for (i = 0; i < arrayLength; i++) {
                barHeight = frequencyData[i];

                self.canvasContext.fillStyle = "hsl(" + i / arrayLength * 360 + ", 100%, 50%)";
                self.canvasContext.fillRect(x, self.canvasHeight - barHeight / 2, barWidth, barHeight / 2);
                x += barWidth + 1;
            }
        }

        drawSpectrum();
    },
    
    _visualizeTimeData: function() {
        var self = this,
            timeData = new Uint8Array(this.analyserNode.frequencyBinCount);

        this.canvasContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        function drawWaveform() {
            self.animationId = requestAnimationFrame(drawWaveform);

            self.analyserNode.getByteTimeDomainData(timeData);

            self.canvasContext.fillStyle = "#272822";
            self.canvasContext.fillRect(0, 0, self.canvasWidth, self.canvasHeight);

            var arrayLength = self.analyserNode.frequencyBinCount,
                barWidth = (self.canvasWidth / arrayLength),
                barHeight,
                height,
                offset,
                x = 0;

            for (i = 0; i < arrayLength; i++) {
                barHeight = timeData[i];
                height = self.canvasHeight  * barHeight / 256;
                offset = self.canvasHeight - height - 1;

                self.canvasContext.fillStyle = "hsl(" + i / arrayLength * 360 + ", 100%, 50%)";
                self.canvasContext.fillRect(i * barWidth, offset, 1, 1);

                x += barWidth + 1;
            }
        }

        drawWaveform();
    },

    _readIntoBuffer: function() {
        var self = this,
            reader = new FileReader(),
            playerLoading = document.getElementById("player-loading");

        reader.onerror = function() {
            this._fileErrorHandler();
        }

        reader.onloadstart = function() {
            playerLoading.style.display = "block";
        }

        reader.onload = function(event) {
            self.context.decodeAudioData(event.target.result, function(buffer) {
                self.buffer = buffer;
                if (self.isPlaying) {
                    self._stop();
                }
                self._play();
            });
        }

        reader.readAsArrayBuffer(this.file);

        reader.onloadend = function() {
            playerLoading.style.display = "none";
        }
    },

    _connectNodes: function() {
        this.sourceNode = this.context.createBufferSource();
        this.sourceNode.buffer = this.buffer;
        this.sourceNode.loop = true;
        this.gainNode = this.context.createGain();
        this.sourceNode.connect(this.gainNode);
        this._enableFilters(this.gainNode, this.analyserNode);
        this.analyserNode.connect(this.context.destination);
    },

    _getMetadata: function() {
        var self = this;

        ID3.loadTags(self.file.name, function() {
            var tags = ID3.getAllTags(self.file.name);

            document.getElementById("player-title").textContent = tags.title;
            document.getElementById("player-artist").textContent = tags.artist;
            document.getElementById("player-filename").textContent = self.file.name;
        },
        {
            tags: ['title', 'artist'],
            dataReader: FileAPIReader(self.file)
        });
    },

    _play: function() {
        this._connectNodes();
        this.startTime = this.context.currentTime;
        this.sourceNode.start(0, this.startOffset % this.sourceNode.buffer.duration);
        this.isPlaying = 1;
        this.playerControl.setAttribute("data-state", "play");
        this._getMetadata();
        this._setVolume();
        this._setVisualizationType();
    },

    _stop: function() {
        this.sourceNode.stop(0);
        this.startOffset = 0;
    },

    _pause: function() {
        this.sourceNode.stop(0);
        this.startOffset += this.context.currentTime - this.startTime;
        this.playerControl.setAttribute("data-state", "pause");
    },

    _fileErrorHandler: function(event) {
        switch(event.target.error.code) {
            case event.target.error.NOT_FOUND_ERR:
                alert("File is not found.");
                break;
            case event.target.error.NOT_READABLE_ERR:
                alert("File is not readable.");
                break;
            default:
                alert("An error occurred reading this file.")
        };
    },

    _setVolume: function() {
        var volumeControlValue = this.playerVolumeControl.value;

        if (volumeControlValue != 0) {
            this.volumeValue = volumeControlValue;
        }
        this.playerVolumeControl.value = this.volumeValue;
        this.gainNode.gain.value = this.volumeValue;
    },

    _setVisualizationType: function() {
        var visualizationType = this.playerVisualizationControl.value;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        if (visualizationType == "spectrum") {
            this._visualizeFrequencyData();
        } else {
            this._visualizeTimeData();
        }
    },

    _setEqualizerPreset: function() {
        var self = this,
            selectedItem = this.playerEqualizerControl.options[this.playerEqualizerControl.selectedIndex].index,
            preset = this.filterPresets[selectedItem];

        [].forEach.call(this.playerFilterControls, function (element, index) {
            var value = preset.gains[index];

            element.value = value;
            self.filterNodes[index].gain.value = value;
        });
    },

    _handlePlayerControl: function() {
        if (this.playerControl.getAttribute("data-state") == "play") {
            this._pause();
        } else {
            this._play();
        }
    },

    _switchToggleVolume: function() {
        var state = this.playerVolumeToggle.getAttribute("data-state"),
            toggle = (state == "on") ? "off" : "on";

        this.playerVolumeToggle.setAttribute("data-state", toggle);

        if (toggle == "on") {
            this._setVolume();
        } else {
            this.playerVolumeControl.value = 0;
            this.gainNode.gain.value = 0;
        }
    },

    _switchToggleEqualizer: function(event) {
        if (event.target.checked) {
            this._enableFilters(this.gainNode, this.analyserNode);
        } else {
            this._disableFilters(this.gainNode, this.analyserNode);
        }
    },

    _setFilterGain: function(element) {
        var index = element.getAttribute("data-index"),
            value = element.value;

        this.filterNodes[index].gain.value = value;
    },

    _handleFilterRange: function(event) {
        if (event.target !== event.currentTarget) {
            this._setFilterGain(event.target)
        }
        event.stopPropagation();
    },

    _handleDragOverDocument: function(event) {
        event.stopPropagation();
        event.preventDefault();
        document.body.className = "dragover";
    },

    _handleDragHover: function(event) {
        event.stopPropagation();
        event.preventDefault();
        document.body.className = (event.type == "dragover") ? "dragover" : "";
    },

    _handleFileSelect: function(event) {
        var files = event.target.files || event.dataTransfer.files;

        this._handleDragHover(event);

        if (Modernizr.filereader) {
            this.file = files[0];
            if (this.file.type.match('audio.*')) {
                this._readIntoBuffer();
            } else {
                alert("File type is not supported by the Player.");
            }

        } else {
            alert("File API is not supported in this browser.");
        }
    },

    _addEventListner: function() {
        var dropZone = document.getElementById("dropzone"),
            fileUploadInput = document.getElementById("file-upload-input");

        if (Modernizr.draganddrop) {
            document.body.addEventListener("dragover", this._handleDragOverDocument.bind(this), false);
            dropZone.addEventListener("dragover", this._handleDragHover.bind(this), false);
            dropZone.addEventListener("drop", this._handleFileSelect.bind(this), false);
            dropZone.addEventListener("dragleave", this._handleDragHover.bind(this), false);
        }

        fileUploadInput.addEventListener("change", this._handleFileSelect.bind(this), false);
        this.playerControl.addEventListener("click", this._handlePlayerControl.bind(this), false);
        this.playerVolumeControl.addEventListener("change", this._setVolume.bind(this), false);
        this.playerVolumeToggle.addEventListener("click", this._switchToggleVolume.bind(this), false);
        this.playerVisualizationControl.addEventListener("change", this._setVisualizationType.bind(this), false);
        this.playerEqualizerToggle.addEventListener("change", this._switchToggleEqualizer.bind(this), false);
        this.playerEqualizerFilters.addEventListener("change", this._handleFilterRange.bind(this), false);
        this.playerEqualizerControl.addEventListener("change", this._setEqualizerPreset.bind(this), false);
    }
}

window.addEventListener('load', function() {
    var Player = new WebAudioPlayer();

    Player.init();
});
