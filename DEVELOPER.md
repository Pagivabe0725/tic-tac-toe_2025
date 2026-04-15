# Tic tac toe

## Quick summary

This application implements a **tic-tac-toe game** where the user can change the board size from **3 to 9**.

The user can control both the **"O"** and **"X"** characters, which is ideal for a **two-player** mode. There is also an option to play against the **computer**, where the player can choose from **4** different **difficulty levels** (_very easy_, _easy_, _medium_, _hard_). The opponent will react accordingly based on the selected difficulty.

The game also supports saving and loading matches.

## Installation

### Prerequisites

- Install **Node.js** (I’m using **v22.16.0**). This also installs the required **npm package manager**, which is needed to install the **Angular CLI**. You can download it from [here](https://nodejs.org/en).
- Using **npm**, install the **Angular CLI**:
  ```bash
  npm install -g @angular/cli
  ```
- If you want to download the application, use the following command:

  ```bash
  git clone https://github.com/Pagivabe0725/Tic-tac-toe_2025.git
  ```

- After that, run the following command to install all required dependencies:

  ```bash
  npm install
  ```

- Since the application uses **NgRx**, you need to install the following packages:

  ```bash
  npm install @ngrx/store
  ```

- Additionally, **NgRx Effects** must be installed separately:
  ```bash
  npm install @ngrx/effects
  ```

### Running the application

- To run the application locally, use the following command:
  ```bash
  ng serve
  ```
- If you need to run the app on a different port, use:

  ```bash
  ng serve --port 4300
  ```

## Development background

This application was built using **Angular** (version **20.3.5**), leveraging the framework’s **zoneless change detection** and the **Signals** system. The backend is also custom-built, based on **Node.js** and **Express.js**. You can read more about it [here](https://github.com/Pagivabe0725/Tic-Tac-Toe_Backend/tree/main#readme).

Initially, data sharing between components was implemented using a service-based approach. Later in development, this was migrated to an **NgRx**-based solution. To keep the codebase consistent, the application avoids relying on **RxJS** features here as well, and instead continues to use a **Signals-based** approach.

## Project structure

Almost everything is located inside the `app` folder, except the documentation `.md` files, which are stored **outside the `src` folder** in the `doc` directory.

### Components

Components are located inside the `/app/components` folder.  
The underlying idea is that parent components include child components in a tree-like structure.

A typical component layout looks like this:

- `component.html`
- `component.scss`
- `component.ts`
- `component.spec.ts`

It is important to note that **not every component** has a separate **template** and **style** file.  
This is especially common for smaller components.

### Services

[Services](/doc/SERVICES.md) are located inside the `/app/services` folder, where _all services used by the application can be found directly_.

Test files for services are stored in a separate **test** folder inside the same directory:

- `/app/services/test`

### Utils

This is a large “summary” folder that includes [constants](/doc/utils/CONSTANT.md), [interfaces](/doc/utils/INTERFACE.md), helper functions, test helper utilities, interceptors, and [types](/doc/utils/TYPE.md).  
It is also located directly inside the **app** folder: `/app/utils`.

The items listed above are organized into separate subfolders:

- `constants`
- `functions`
- `interceptors`
- `test`
- `types`

#### CSRF Interceptor

Ensures every outgoing HTTP request includes a valid **CSRF token** by fetching it from the `Csrf` service, then cloning the request to add the `X-CSRF-Token` header and enabling `withCredentials`.

### Store

This folder (`/app/store`) contains the NgRx-related files used by the application, including **actions**, **effects**, **selectors**, and **reducers**.

Each category is organized into its own subfolder:

- `actions`
- `effects`
- `reducers`
- `selectors`

### Shared

The `/app/shared` folder currently contains only _reusable and extracted_ **SCSS** style files that are applied across the entire application.

Styles are organized into their own directory (`/app/shared/styles`):

- `styles`

### Guards

The `/app/guards` folder currently contains a single **guard** and its corresponding test file. Its responsibility is to redirect **unauthenticated users** to the `/not-found` page.

- `account-guard.ts`
- `account-guard.spec.ts`

## Tests

The application includes pre-written unit tests. These tests are written in **Jasmine**, and Angular provides a built-in way to run them and view the results in a browser interface.

To run the tests:

```bash
ng test
```

If you want to see test coverage, the following command generates an HTML report:

```bash
 ng test --code-coverage
```

Component tests are located inside their component folders, while service tests are stored separately under:

- `/app/services/test`
