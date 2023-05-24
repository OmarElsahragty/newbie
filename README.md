# 🚀👶🏻 Newbie (Restful APIs Generator)

**Project Description**: Newbie generates an advanced production level Express backend using TypeScript based on an input YAML file that contains only the models. It automates the process of setting up the server, routing, and database integration, saving developers valuable time and effort.👨‍💻💻

## Table of Contents 📑

- [Installation](#installation) 🛠️
- [Usage](#usage) ✍️
- [Models](#models) 🧠
- [Supported Types](#supported-types) 🔢🔤
- [Database Integration](#database-integration) 📊
- [Contributing](#contributing) 🤝
- [License](#license) 📃

## Installation 🛠️

To use Newbie, follow these steps:

1. Ensure that MongoDB is installed and running locally on your machine. 📦

2. Clone the repository: 👯‍♂️

- `git clone https://github.com/OmarElsahragty/newbie.git 👯‍♀️`

3. Install the dependencies:

- cd newbie 💿
- npm install or yarn

## Models 🧠

To define the models for your backend, create a YAML file (`newbie.example.yaml`) in the root directory of the project. This file should contain the data models required for your application. The YAML file should be well-structured and case-sensitive for the field names but feel free with your own values that will be later on the attribute names for each model. Below is an example YAML file:

```yaml
- users:
    auth:
      identifier: email
      password: password

    attributes:
      - name: first_name
        type: string
        required: true

      - name: last_name
        type: string
        required: true

      - name: email
        type: string
        unique: true
        required: true

      - name: password
        type: string
        required: true

      - name: bio
        type: string

- posts:
    attributes:
      - name: title
        type: string
        required: true

      - name: content
        type: string
        required: true

      - name: author_id
        type: user
        required: true

      - name: comments
        type: decimal
        array: true

        attributes:
          - name: writer_id
            type: user
            required: true

          - name: content
            type: string
            required: true

      - name: tags
        type: object
        array: true

        attributes:
          - name: name
            type: string
            required: true

      - name: likes
        type: user
        array: true

      - name: visibility
        type: string
        default: private
        enum: [public, private]

- messages:
    attributes:
      - name: sender_id
        type: user
        required: true

      - name: recipient_id
        type: user
        required: true

      - name: subject
        type: string
        required: true

      - name: body
        type: string
        required: true

      - name: read_at
        type: date

- notifications:
    attributes:
      - name: type
        type: string
        required: true

      - name: data
        type: string

      - name: read_at
        type: date

- friendships:
    attributes:
      - name: user_id
        type: user
        required: true

      - name: friend_id
        type: user
        required: true

      - name: status
        type: string
        default: pending
        enum: [pending, accepted, rejected]

      - name: initiated_by
        type: string
        default: user
        enum: [user, friend]

      - name: initiated_at
        type: date

      - name: accepted_at
        type: date

      - name: rejected_at
        type: date
```

- Good Hint : Use auth field on any model like users in the previous example if auth field is existing don't forget defining the accessType: "ADMIN" in the register endpoint for the first super user to get the bearer token for accessing the rest of the backend.

## Supported Types

- string: Represents a string value. 💬
- number: Represents a numeric value. 🔢
- bigint: Represents a BigInt value. 🔢
- boolean: Represents a boolean value (true or false). ✅❌
- date: Represents a date value. 📅
- undefined: Represents an undefined value. ❓
- null: Represents a null value. 🚫
- array: Represents an array of values. 📚
- object: Represents an object with specified properties. 📁
- record: Represents an object with string keys and values of a specific type. 📚
- function: Represents a function. ⚙️
- literal: Represents a literal value. 📝
- enum: Represents a value from a predefined set of options. 🏷️
- nativeEnum: Represents a value from a predefined set of options using TypeScript's enum type. 🏷️
- promise: Represents a promise value. ⏳
- lazy: Represents a lazily evaluated value. 🛋️
- tuple: Represents a tuple with a fixed number of elements of different types. 📦
- intersection: Represents the intersection of multiple types. ⚓
- union: Represents a value that can be one of several types. 🔀
- optional: Represents an optional value. 🔄
- nullable: Represents a value that can be either of a specified type or null. ⚠️
- transformer: Represents a value transformed by a given transformation function. 🔄
- instanceof: Represents a value that is an instance of a specific class. 📦
- refinement: Represents a value that meets a specific refinement condition. ✔️
- check: Represents a value that passes a custom validation check. ✔️

## Usage

To generate the backend, run the following command:

1. Define the destination path in the index file
2. `npm run generate 🏃🏻 `

## Database Integration

The backend integrates with MongoDB as the database. Make sure that MongoDB is running and accessible before starting the backend
more databases will be supported in the future. 📊

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request on the GitHub repository. 🤝

## License

This project is licensed under the MIT License. Feel free to modify and use it according to your needs. 📃

By following the instructions provided in this README, you will be able to generate an advanced production level Express backend using TypeScript in just seconds. If you have any questions or encounter any difficulties, please don't hesitate to reach out for support. Happy Automation! 🔥🔥🤖
