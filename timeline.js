
class Event {
  constructor(description, date, timeline){
    this.description = description;
    this.date = date;
    this.timeline = timeline;
    this.pos = {};
    this.width = 0;
    this.height = 0;

    // todo: change these to objects to avoid double-counting
    this.causes = []; 
    this.effects = [];
  }

  fourZeroify(year){
    if (year > 999) {
      return year;
    } else if (year > 99 && year <= 999 ) {
      return `0${year}`;
    } else if (year > 9 && year <= 99) {
      return `00${year}`;
    }
  }

  twoZeroify(n){
    if (n > 9) return n;
    return `0${n}`;
  }

  getInputDateString() {
    let year = this.fourZeroify(this.date.getUTCFullYear());
    let month = this.twoZeroify(this.date.getUTCMonth() + 1);
    let date = this.twoZeroify(this.date.getUTCDate());
    let string = `${year}-${month}-${date}`;
    return string;
    
  }
}

class Timeline {
  constructor(canvas) {
    // styling 
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.timelineX = this.width * 0.20;

    //functions
    this.compareEventDates = this.compareEventDates.bind(this);
    this.drawEvent = this.drawEvent.bind(this);
    this.drawTimelineDate = this.drawTimelineDate.bind(this);
    this.allowSelection = this.allowSelection.bind(this);
    this.lineDrawMousedown = this.lineDrawMousedown.bind(this);
    this.lineDrawMousemove = this.lineDrawMousemove.bind(this);
    this.lineDrawMouseup = this.lineDrawMouseup.bind(this);
    this.drawLine = this.drawLine.bind(this);
    this.findIntersection = this.findIntersection.bind(this);
    this.updateEventCausality = this.updateEventCausality.bind(this);

    //selection state
    this.clicked = null;
    
    // drawing state
    this.isDrawing = false;
    this.lineX = 0;
    this.lineY = 0;

    this.events = [];
    this.intersections = {};
    this.lines = [];
  }

  findIntersection(e) {
    let x = e.offsetX;
    let y = e.offsetY;
    let intersected;

    for (let i = 0; i < this.events.length; i++) {
      let event = this.events[i];
      if (
        y > event.pos.y &&
        y < event.pos.y + event.height &&
        x > event.pos.x &&
        x < event.pos.x + event.width
      ) {
        intersected = i;
        return intersected;
      }
    }
  }

  allowSelection() {
    this.canvas.addEventListener('click', (e) => {
      let i = this.findIntersection(e);
      if (i !== null) { 
        document.getElementById("event-description-edit").value = this.events[i].description;
        document.getElementById("event-date-edit").value = this.events[i].getInputDateString();
        this.clicked = i;
      }
    })
  }

  lineDrawMousedown() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.lineX = e.offsetX;
      this.lineY = e.offsetY;
      this.isDrawing = true;
    })
  }

  lineDrawMousemove() {
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDrawing === true) {
        let i = this.findIntersection(e);
        this.intersections[i] = i;
        this.drawLine(e.offsetX, e.offsetY);
        this.lineX = e.offsetX;
        this.lineY = e.offsetY;
      }
    })
  }

  lineDrawMouseup() {
    window.addEventListener('mouseup', (e) => {
      if (this.isDrawing === true) {
        this.lineX = 0;
        this.lineY = 0;
        this.isDrawing = false;
        this.updateEventCausality();
        this.intersections = {};
        this.draw();
      }
    })
  }

  drawLine(offsetX, offsetY) {
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 1;
    this.ctx.moveTo(this.lineX, this.lineY);
    this.ctx.lineTo(offsetX, offsetY);
    this.ctx.stroke();
    this.ctx.closePath();
  }

  updateEventCausality() {
    let indices = Object.values(this.intersections);
    indices.pop();
    for (let i = 0; i < indices.length; i++) {
      let current = indices[i];
      let child = indices[i + 1];
      let parent = indices[i - 1];
      if (this.events[parent]) {
        this.events[current].causes.push(this.events[parent]);
      }
      if (this.events[child]) {
        this.events[current].effects.push(this.events[child]);
      }
    }
  }

  updateEventArray(eve) {
      this.events = [...this.events, eve].sort(this.compareEventDates);
  }

  addEvent(description, date) {
    let eve = new Event(description, date, this);
    this.updateEventArray(eve);
    this.draw();
  }


  compareEventDates(event1, event2) {
    if (!event1 || !event2 || !event1.date || !event2.date) {
      return undefined;
    } else if (Number(event1.date) === Number(event2.date)) {
      return 0;
    } else if (Number(event1.date) > Number(event2.date)) {
      return 1;
    } else if (Number(event1.date) < Number(event2.date)) {
      return -1;
    } else {
      return undefined;
    }
  }

  isSameDate(event1, event2) {
    if (Number(event1.date) === Number(event2.date)) return true;
    return false;
  }

  drawTimeline() {
    this.ctx.lineWidth = 10;
    this.ctx.beginPath();
    this.ctx.moveTo(this.timelineX, 0);
    this.ctx.lineTo(this.timelineX, this.height);
    this.ctx.closePath();
    this.ctx.stroke();
  }

  drawEvent(eve) {
    eve.width = this.ctx.measureText(eve.description).width + 20;
    eve.height = 40;
    this.ctx.strokeRect(eve.pos.x, eve.pos.y + 10, eve.width, eve.height);
    this.ctx.fillText(eve.description, eve.pos.x + 10, eve.pos.y + 30);
    this.ctx.closePath();
  }

  drawTimelineDate(eve) {
    let dateText = eve.date.toUTCString().split(" ", 4);
    this.ctx.fillText(dateText.join(" "), this.timelineX + 10, eve.pos.y + 30);
  }

  drawCausalityArrow(e1, e2) {
    let isSimultaneous = e2.pos.y === e1.pos.y;

    // draw arc
    let center = [(e2.pos.x + e1.pos.x)/2, (e2.pos.y + 20 + e1.pos.y)/2];
    let radius = (e2.pos.y - e1.pos.y) / 2;
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'blue';
    if (isSimultaneous) {
      radius = (e2.pos.x - e1.pos.x) / 2;
      this.ctx.arc(...center, radius, Math.PI, 2 * Math.PI);
    } else {
      this.ctx.arc(...center, radius, 0.5 * Math.PI, 1.5 * Math.PI);
    }
    this.ctx.stroke();
    this.ctx.closePath();

    let offsetX = e2.pos.x;
    let offsetY = e2.pos.y + 12;

    //draw arrowhead
    this.ctx.beginPath();
    this.ctx.moveTo(offsetX, offsetY);
    this.ctx.lineTo(offsetX - 12, offsetY);
    this.ctx.lineTo(offsetX, offsetY - 12);
    this.ctx.fill();


    //reset
    this.ctx.strokeStyle = 'black';
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawTimeline();

    this.ctx.lineWidth = 2;
    let rootX = this.width * 0.50;
    let eventX = rootX;
    let eventY = 30;
    
    // draw events
    for (let i = 0; i < this.events.length; i++) {
      let compare = this.compareEventDates(this.events[i], this.events[i - 1]);
      
      if (i === 0) {
        this.events[i].pos = { x: eventX, y: eventY };
        this.drawTimelineDate(this.events[i]);
        this.drawEvent(this.events[i]);
      } else if (compare === 0) {
        eventX += 70;
        this.events[i].pos = { x: eventX, y: eventY };
        this.drawEvent(this.events[i]);
      } else if (compare === 1 || compare === -1 || date) {
        eventX = rootX;
        eventY += 70;
        this.events[i].pos = { x: eventX, y: eventY };
        this.drawTimelineDate(this.events[i]);
        this.drawEvent(this.events[i]);
      } else if (!date) {
        // throw error
      }
    }

    // draw causality arrows
    for (let i = 0; i < this.events.length; i++) {
      let event = this.events[i];
      for (let j = 0; j < event.effects.length; j++) {
        this.drawCausalityArrow(event, event.effects[j]);
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", function(){

  const width = window.innerWidth;
  const height = window.innerHeight;
  const canvasTimeline = document.getElementById("timeline");
  canvasTimeline.width = width*0.65;
  canvasTimeline.height = height;


  let ctx = canvasTimeline.getContext('2d'); // also used in Timeline class

  const timeline = new Timeline(canvasTimeline);
  timeline.draw();

  //// ADD/EDIT/DELETE ////
  
  document.getElementById("add-event-form").addEventListener("submit", (e) => {
    e.preventDefault();
    let descriptionValue = document.getElementById("event-description").value;
    let dateValue = document.getElementById("event-date").valueAsDate;

    timeline.addEvent(descriptionValue, dateValue);
  });
  
  document.getElementById("edit-event-form").addEventListener("submit", (e) => {
    e.preventDefault();
    let descriptionValue = document.getElementById("event-description-edit").value;
    let dateValue = document.getElementById("event-date-edit").valueAsDate;
    if (timeline.clicked >= 0) {
      timeline.events[timeline.clicked].description = descriptionValue;
      timeline.events[timeline.clicked].date = dateValue;
      timeline.updateEventArray();
      timeline.draw();
    }
  });

  document.getElementById("event-btn-delete").addEventListener("click", (e) => {
    e.preventDefault();
    if (timeline.clicked >= 0) {
      timeline.events.splice(timeline.clicked, 1);
      timeline.draw();
    }
  })

  //// SELECTION EVENT LISTENERS ////
  timeline.allowSelection();

  //// LINE DRAWING EVENT LISTENERS ////
  timeline.lineDrawMousedown();
  timeline.lineDrawMousemove();
  timeline.lineDrawMouseup();

  timeline.addEvent("test1", new Date('December 17, 1995'));
  timeline.addEvent("test2", new Date('December 17, 1996'));
  timeline.addEvent("test3", new Date('December 17, 1995'));
  timeline.addEvent("test4", new Date('December 17, 1997'));
});