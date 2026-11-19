# realtime-battles Specification

## Purpose

Runs a started battle live: one synchronized phase machine for the whole room, ready and submission gates with host override, self-timed solves, and recovery across refreshes and server restarts.

## Requirements

### Requirement: The live battle reaches every connected member
The system SHALL deliver a room's active battle to every member connected to the room — the battle's full current state on connect and after every change — and SHALL reject battle actions from members who are not participants of that battle.

#### Scenario: A member connecting mid-battle receives its state
- **WHEN** a room member connects while their room has an active battle
- **THEN** they receive the battle's current state: its phase, the current round, the results of completed rounds, and which participants have readied or submitted in the current phase

#### Scenario: A late joiner can watch but not act
- **WHEN** a member who is not a participant of the active battle views the battle
- **THEN** they receive the battle's state, and their ready and solve submissions are rejected

### Requirement: Rounds progress through synchronized phases
The system SHALL move every participant through the same phase sequence for each round — the round's scramble shown, a short countdown, inspection, solving, results — with each transition decided once on the server and applied to all cubers at the same moment, and countdowns on every screen SHALL count to the same deadline.

#### Scenario: Every screen moves together
- **WHEN** a phase transition occurs
- **THEN** every connected cuber's screen shows the new phase at the same time

#### Scenario: Countdowns agree across screens
- **WHEN** cubers view a phase that has a deadline
- **THEN** their countdowns all reach zero at the same moment

#### Scenario: Zero-length inspection is skipped
- **WHEN** a battle is configured with zero inspection time
- **THEN** the countdown leads directly into solving, with no inspection phase

### Requirement: Scrambles are revealed one round at a time
The system SHALL show only the current round's scramble while a battle is running, and SHALL NOT reveal later rounds' scrambles to any cuber before their round begins.

#### Scenario: Later scrambles stay hidden
- **WHEN** a cuber views the battle during round 1
- **THEN** round 1's scramble is shown and no other round's scramble is

### Requirement: Ready gates wait for every participant
The system SHALL advance a ready gate when every battle participant has readied, when the configured ready timeout passes, or when the host forces it, and SHALL reject force from anyone who is not the host.

#### Scenario: All participants ready advances the gate
- **WHEN** the last participant readies during a ready-gated phase
- **THEN** the phase advances immediately for everyone

#### Scenario: The ready timeout advances the gate
- **WHEN** the configured ready timeout passes with participants unready
- **THEN** the phase advances anyway and the unready participants are carried along

#### Scenario: The host forces a gate
- **WHEN** the host forces a ready gate
- **THEN** the phase advances immediately regardless of who has readied

#### Scenario: A non-host cannot force a gate
- **WHEN** a participant who is not the host attempts to force a gate
- **THEN** the attempt is rejected and the phase is unchanged

### Requirement: Cubers submit one self-timed solve per round
The system SHALL accept one solve submission per participant per round while the solving phase is open — the cuber's own measured time with a penalty of none, plus-two, or DNF — and SHALL reject repeats from a cuber who already submitted. During solving, cubers SHALL see who has submitted but not each other's times.

#### Scenario: A solve is recorded
- **WHEN** a participant stops their timer during solving and submits
- **THEN** their time and penalty are recorded for the round

#### Scenario: Visibility during solving
- **WHEN** a participant submits during the solving phase
- **THEN** the other cubers see that they have finished, but not their time

#### Scenario: A repeated submission is rejected
- **WHEN** a participant who already submitted for the round submits again
- **THEN** the second submission is rejected and the recorded solve is unchanged

### Requirement: The solving phase ends when everyone has solved
The system SHALL end the solving phase when every participant has submitted, or when the host forces it, and on a forced end SHALL record DNF solves for participants who have not submitted.

#### Scenario: All submitted ends solving
- **WHEN** the last participant submits during solving
- **THEN** the results phase begins for everyone

#### Scenario: A forced end marks missing solves as DNF
- **WHEN** the host forces the solving phase to end with participants unsubmitted
- **THEN** each unsubmitted participant gets a DNF solve for the round and results begin

### Requirement: Round results show ranked times
The system SHALL show, during the results phase, every participant's solve for the round ranked by final time, with plus-two solves shown adjusted, DNFs shown unsolved, and placements derived from that order.

#### Scenario: Results rank the round
- **WHEN** the results phase begins for a round
- **THEN** every cuber sees all participants' solves ranked fastest-first, plus-two times shown with their adjustment, and DNFs last

### Requirement: The battle recovers across refreshes and restarts
The system SHALL keep a cuber's ready and submitted state keyed to the cuber across reconnects, and after a server restart SHALL resume the battle from its recorded checkpoint with ready state reset and submitted solves intact.

#### Scenario: A refresh keeps the cuber's state
- **WHEN** a cuber who has readied or submitted reloads their page and reconnects
- **THEN** their ready or submitted state is still theirs, and their countdown resumes

#### Scenario: A server restart resumes the battle
- **WHEN** the server restarts mid-battle and cubers reconnect
- **THEN** the battle resumes at the checkpointed round and phase, everyone starts unready for the current gate, and already submitted solves remain

#### Scenario: An expired deadline fires on resume
- **WHEN** the battle resumes into a gated phase whose deadline already passed
- **THEN** the gate fires rather than waiting

### Requirement: Final standings rank by placement points
The system SHALL, when the battle ends, show standings ranking cubers by placement points accumulated over all rounds, where each round's winner scores the most, lower placements score fewer, and a DNF round scores zero.

#### Scenario: Standings accumulate across rounds
- **WHEN** the battle ends after its final round
- **THEN** the standings rank cubers by their accumulated placement points

#### Scenario: A DNF round scores nothing
- **WHEN** a cuber's solve in a round is a DNF
- **THEN** that round contributes zero points to their standing
