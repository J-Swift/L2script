import { iShape, Text, Circle, Rectangle, Line, Polygon, Point } from './shape';
import { generateName, forEachPromise } from './util';

// Settings
const objectTypes: { [key: string]: (name: string) => iShape } = {
    'text': Text.create,
    'circle': Circle.create,
    'ellipse': Circle.create,
    'rectangle': Rectangle.create,
    'rect': Rectangle.create,
    'line': Line.create,
    'polygon': Polygon.create
};
const svgns: string = "http://www.w3.org/2000/svg";
const width: number = 640;
const height: number = 480;
const varNamingRule: RegExp = /[A-Za-z][A-Za-z0-9_]+/;
// Collections
let items: { [key: string]: iShape } = {};
let timers: NodeJS.Timeout[] = [];
// Setup DOM
const scriptConsole = document.getElementById('console');
const output = document.getElementById('output');
const svg = document.createElementNS(svgns, "svg");
const code = document.getElementById('code');
// Configure initial svg
svg.setAttribute("width", width.toString());
svg.setAttribute("height", height.toString());
output && output.appendChild(svg);

// Console line
let lastConsoleLineNumber: number = 0;
const log = (message: string) => {
    const logItem = document.createElement('div');
    logItem.className = `line l${lineNumber}`
    logItem.innerHTML = `
        <span class="lineNumber">${lastConsoleLineNumber == lineNumber ? '' : lineNumber}</span>
        <span class="message">${message}</span>
    `;
    if (scriptConsole) {
        scriptConsole.appendChild(logItem);
        scriptConsole.scrollTop = scriptConsole.scrollHeight;
    }
    lastConsoleLineNumber = lineNumber;
}

// Commands
const cleanCommand = (line: string) => {
    const words = line.trim().split(' ');
    const removeWords = [' '];
    // Filter out banned words
    let out: string[] = [];
    for (let i = 0; i < words.length; i++) {
        if (removeWords.indexOf(words[i]) < 0) {
            out.push(words[i]);
        }
    }
    // But if line started with a space, inject the last with object
    if (/^\s/.test(line)) {
        out.splice(1, 0, String(withObjName));
    }
    // Return it
    return out;
}

const create = (varName: string, type: string): iShape | void => {
    varName = varName || generateName();
    const object = items[varName];
    if (object) {
        return log(`There is already an object called ${varName}, you can't use the same name.`)
    }
    if (!varNamingRule.test(varName)) {
        return log(`Name of your object must start with a letter and contain only letters, numbers or underscore.`);
    }
    if (!type) {
        return log(`You must set a type of object to create, like this: create text called title`);
    }
    if (!objectTypes[type]) {
        return log(`${type} not a valid object type, must be one of these: ${Object.keys(objectTypes).join(', ')}`);
    }
    items[varName] = objectTypes[type](varName);
    withObjName = varName;
    svg.appendChild(items[varName].domElement);
    log(`Created ${type} object called ${varName}`);
    return items[varName];
}

const clone = (fromVarName: string, toVarName: string): iShape | void => {
    const fromObject = getItem(fromVarName);
    if (fromObject) {
        const toObject = create(toVarName, fromObject.type);
        if (toObject) {
            toObject.moveTo(fromObject.x, fromObject.y);
            toObject.sizeTo(fromObject.width, fromObject.height);
            toObject.fill = fromObject.fill;
            toObject.setStroke(fromObject.stroke.color, fromObject.stroke.width);
            withObjName = toVarName;
            svg.appendChild(toObject.domElement);
            log(`Duplicated ${fromVarName} as ${toVarName}`);
            return toObject;
        }
    }
}

const getItem = (varName: string): iShape | null => {
    const object = items[varName];
    if (object) {
        return object;
    }
    log(`There was no object called ${varName}.`)
    return null;
}

const paint = (varName, color) => {
    const object = getItem(varName);
    if (object) {
        object.fill = color;
        withObjName = varName;
        return log(`Painting ${varName} ${color}`);
    }
}

const wait = (n, unitName) => {
    let units = 'millisecond';
    const factor = (() => {
        if (/^(seconds?|sec|s)$/i.test(unitName)) {
            units = 'second';
            return 1000;
        }
        return 1;
    })();
    const ms = ((n > 0) ? n : 1000) * factor;
    log(`Waiting for ${n} ${units + (n > 1 ? 's' : '')}`);
    return new Promise((resolve) => {
        timers.push(setTimeout(() => {
            log(`${n} ${units + (n > 1 ? 's' : '')} timer finished`)
            resolve();
        }, ms));
    });
}

const remove = (varName) => {
    const object = getItem(varName);
    if (object) {
        object.remove();
        delete items[varName];
        delete items[`${varName}.text`];
        return log(`Removing object called ${varName}`);
    }
    log(`There was no object called ${varName}`);
}

const write = (varName, text) => {
    const object = getItem(varName);
    if (object) {
        object.text = text.join(' ');
        return log(`Wrote "${text}" in ${varName}`);
    }
}

const setStroke = (varName: string, color: string, width: number) => {
    const object = getItem(varName);
    if (object) {
        object.setStroke(color, width);
        return log(`Set ${varName} stroke color to ${color} and width to ${width}`);
    }
}

const moveTo = (varName: string, x: number | null, y: number | null) => {
    const object = getItem(varName);
    if (object) {
        object.moveTo(x, y);
        return log(`Moved ${varName} to ${object.x},${object.y}`);
    }
}

const moveBy = (varName: string, x: number | null, y: number | null) => {
    const object = getItem(varName);
    if (object) {
        object.moveBy(x, y);
        return log(`Moved ${varName} to ${object.x},${object.y}`);
    }
}

const sizeTo = (varName: string, x: number | null, y: number | null) => {
    const object = getItem(varName);
    if (object) {
        object.sizeTo(x, y);
        return log(`Sized ${varName} to ${object.width},${object.height}`);
    }
}

const sizeBy = (varName: string, x: number | null, y: number | null) => {
    const object = getItem(varName);
    if (object) {
        object.sizeBy(x, y);
        return log(`Sized ${varName} to ${object.width},${object.height}`);
    }
}

const setPoints = (varName: string, points: string[]) => {
    const object = getItem(varName);
    if (object) {
        let arrPoints: Point[] = [];
        points.forEach((point) => {
            const arrPoint = point.split(',');
            arrPoints.push(new Point(Number(arrPoint[0]), Number(arrPoint[1])));
        });
        object.setPoints(arrPoints);
        return log(`Set points ${varName} to ${object.width},${object.height}`);
    }
}

const reset = () => {
    // Clear out everything
    svg.innerHTML = '';
    items = {};
    lineNumber = 0;
    timers.forEach((timer) => {
        clearTimeout(timer);
        clearInterval(timer);
    });
    timers = [];
    withObjName = null;
}

const setWith = (varName: string) => {
    const object = getItem(varName);
    if (object) {
        withObjName = varName;
        return log(`Set currently selected object as ${varName}`);
    }
}

const commands = {
    paint: (words: string[]) => {
        return paint(words[1], words[2]);
    },
    remove: (words: string[]) => {
        return remove(words[1]);
    },
    new: (words: string[]) => {
        return create(words[2], words[1]);
    },
    clone: (words: string[]) => {
        return clone(words[1], words[2]);
    },
    write: (words: string[]) => {
        return write(words[1], words.slice(2));
    },
    reset: () => {
        return reset();
    },
    width: (words: string[]) => {
        return sizeTo(words[1], Number(words[2]), null);
    },
    height: (words: string[]) => {
        return sizeTo(words[1], null, Number(words[2]));
    },
    left: (words: string[]) => {
        return moveTo(words[1], Number(words[2]), null);
    },
    top: (words: string[]) => {
        return moveTo(words[1], null, Number(words[2]));
    },
    outline: (words: string[]) => {
        return setStroke(words[1], words[2], Number(words[3]) || 1);
    },
    with: (words: string[]) => {
        return setWith(words[1]);
    },
    move: (words: string[]) => {
        return moveBy(words[1], Number(words[2]), Number(words[3]));
    },
    position: (words: string[]) => {
        return moveTo(words[1], Number(words[2]), Number(words[3]));
    },
    points: (words: string[]) => {
        return setPoints(words[1], words.slice(2));
    },
    size: (words: string[]) => {
        return sizeTo(words[1], Number(words[2]), Number(words[3]));
    },
    grow: (words: string[]) => {
        return sizeBy(words[1], Number(words[2]), Number(words[3]));
    },
    wait: (words: string[]) => {
        return wait(words[1], words[2]);
    }
};

// Render it
let lineNumber: number = 0;
let withObjName: string | null = null;
const render = () => {
    reset();
    scriptConsole && (scriptConsole.innerHTML = '');
    // Parse content
    const lines = code ? code.innerText.split("\n") : [];
    
    forEachPromise(lines, (line) => {
        // Increment line number
        lineNumber += 1;
        // Ignore blank lines
        if (line.length) {
            // Echo line
            log(line);
            // Parse it
            let words = cleanCommand(line);
            // Get command
            const action = words[0] == ' ' ? words[1] : words[0];
            const command = commands[action];
            // Execute command
            if (command) {
                return command(words);
            }
            log(`Invalid command: ${action}`);
        }
    });
    // Save content
    localStorage.setItem('lastRunCode', code ? code.innerText : '');
}

// Event listener
const btnRun = document.getElementById('run');
btnRun && btnRun.addEventListener('click', render);

// Restore from local storage
let lastRunCode = localStorage.getItem('lastRunCode');
if (lastRunCode && code) {
    code.innerText = lastRunCode;
}
else if (code) {
    code.innerText += "new rectangle background\n" +
        "  size 640 480\n" +
        "  paint black\n";
}
render();
